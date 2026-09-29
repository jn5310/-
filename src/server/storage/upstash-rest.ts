import "server-only";

import { StorageError } from "./errors";

/*
 * Upstash Redis REST 클라이언트 (의존성 없음) — 풀이 저장소와 매각 실사용 지표가 함께 쓴다.
 * Vercel KV는 Upstash로 옮겨졌다: Vercel Marketplace에서 Upstash Redis를 연결하면
 * KV_REST_API_URL · KV_REST_API_TOKEN이 자동으로 들어온다 (둘 다 인식한다).
 */

type Env = Record<string, string | undefined>;
export type RedisCommand = (string | number)[];

const TIMEOUT_MS = 5_000;

export interface UpstashConfig {
  url: string;
  token: string;
}

/** 둘 중 하나만 있으면 설정 실수다 — 조용히 넘어가지 않고 알린다 */
export function readUpstashConfig(
  env: Env = process.env,
): UpstashConfig | null {
  const url = (env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL)?.trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN)?.trim();
  if (!url && !token) return null;
  if (!url || !token) {
    throw new StorageError(
      "configuration",
      "Set both UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
    );
  }
  return { url: url.replace(/\/+$/, ""), token };
}

export class UpstashRest {
  constructor(
    private readonly config: UpstashConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** 명령 하나 — 예) ["SET","k","v","EX",60,"NX"] */
  async command(args: RedisCommand): Promise<unknown> {
    const body = await this.post(this.config.url, args);
    const reply = body as { result?: unknown; error?: string };
    if (reply.error)
      throw new StorageError("unavailable", `Upstash error: ${reply.error}`);
    return reply.result;
  }

  /** 여러 명령을 한 번에 (원자적이지는 않다) — 결과 배열을 같은 순서로 돌려준다 */
  async pipeline(commands: RedisCommand[]): Promise<unknown[]> {
    if (commands.length === 0) return [];
    const body = await this.post(`${this.config.url}/pipeline`, commands);
    if (!Array.isArray(body)) {
      throw new StorageError(
        "unavailable",
        "Upstash pipeline returned an unexpected body.",
      );
    }
    return body.map((reply: { result?: unknown; error?: string }) => {
      if (reply?.error)
        throw new StorageError("unavailable", `Upstash error: ${reply.error}`);
      return reply?.result;
    });
  }

  private async post(url: string, payload: unknown): Promise<unknown> {
    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      throw new StorageError("unavailable", "Upstash request failed", {
        cause: error,
      });
    }

    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok || body === null) {
      const detail =
        (body as { error?: string } | null)?.error ?? `HTTP ${response.status}`;
      // 401·403은 토큰 문제 — 다시 해도 낫지 않는다
      throw new StorageError(
        response.status === 401 || response.status === 403
          ? "configuration"
          : "unavailable",
        `Upstash error: ${detail}`,
      );
    }
    return body;
  }
}
