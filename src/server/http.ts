import "server-only";

import {
  abortToError,
  NameGenerationError,
} from "@/server/name-generation/errors";

/**
 * JSON 요청 본문을 크기 제한을 지키며 읽는다.
 * Content-Length를 믿지 않고 스트림을 읽으면서 바이트 수를 센다.
 *
 * @param signal 전체 제한 시간 — 업로드가 느리게 이어져도 이 시간 안에 끊는다
 */
export async function readJsonBody(
  request: Request,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!/^application\/json\b/i.test(contentType.trim())) {
    throw new NameGenerationError("UNSUPPORTED_MEDIA_TYPE");
  }

  const bytes = await readBodyBytes(request, maxBytes, signal);
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch (error) {
    throw new NameGenerationError("INVALID_JSON", { cause: error });
  }
}

/**
 * 요청 본문을 바이트 그대로 읽는다 (크기 제한). 웹훅 서명 검증처럼 원문이 한 바이트도 바뀌면 안 될 때 쓴다.
 */
export async function readBodyBytes(
  request: Request,
  maxBytes: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (declared > maxBytes) throw new NameGenerationError("PAYLOAD_TOO_LARGE");
  if (!request.body) {
    throw new NameGenerationError("INVALID_JSON", {
      detail: "Empty request body.",
    });
  }

  const reader = request.body.getReader();
  const cancel = () => void reader.cancel().catch(() => {});
  signal?.addEventListener("abort", cancel, { once: true });

  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (signal?.aborted) throw abortToError(signal);
      if (done) break;
      received += value.byteLength;
      if (received > maxBytes) {
        cancel();
        throw new NameGenerationError("PAYLOAD_TOO_LARGE");
      }
      chunks.push(value);
    }
  } catch (error) {
    if (error instanceof NameGenerationError) throw error;
    if (signal?.aborted) throw abortToError(signal, error);
    // 업로드 도중 연결이 끊긴 경우 — 서버 오류가 아니다
    throw new NameGenerationError("CLIENT_CLOSED", { cause: error });
  } finally {
    signal?.removeEventListener("abort", cancel);
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function jsonResponse(
  body: unknown,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });
}
