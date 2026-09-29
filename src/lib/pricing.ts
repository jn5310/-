import type { PremiumOffer } from "@/types/reading";

/**
 * 프리미엄 풀이 가격 — 결제 금액(Stripe Checkout)과 화면 표시가 모두 이 값 하나를 쓴다.
 * 가격을 바꾸려면 여기만 고치면 된다.
 */
export const PREMIUM_OFFER: PremiumOffer = { amount: 399, currency: "usd" };

/** 399 → "$3.99" */
export function formatPrice({ amount, currency }: PremiumOffer): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}
