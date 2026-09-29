import { jsonResponse } from "@/server/http";
import { PaymentError } from "@/server/payments/errors";
import { paymentFailureResponse } from "@/server/payments/respond";
import { isReadingId } from "@/server/readings/repository";
import { getReadingView } from "@/server/readings/service";
import type { ReadingSuccess } from "@/types/api";

/**
 * GET /api/readings/:id[?session_id=cs_…] — 풀이 조회.
 *
 * 결제한 풀이면 전체(PremiumReadingView), 아니면 무료 미리보기(FreeReadingView)를 돌려준다.
 * session_id가 있으면 Stripe에서 결제를 확인해 바로 연다 (웹훅 지연 보완, 멱등).
 */

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const { id } = await params;
    if (!isReadingId(id)) throw new PaymentError("VALIDATION_ERROR");

    const sessionId = new URL(request.url).searchParams.get("session_id");
    const view = await getReadingView(id, { sessionId });
    if (!view) throw new PaymentError("READING_NOT_FOUND");

    const body: ReadingSuccess = { ok: true, data: view, meta: { requestId } };
    return jsonResponse(body, 200, { "X-Request-Id": requestId });
  } catch (error) {
    return paymentFailureResponse(error, requestId, "api/readings");
  }
}
