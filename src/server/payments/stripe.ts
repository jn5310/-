import "server-only";

import Stripe from "stripe";

import { PaymentError } from "./errors";

/*
 * Stripe 설정 — 비밀 키는 서버에서만 읽는다 (NEXT_PUBLIC_ 접두어를 붙이지 않는다).
 * API 버전은 설치된 SDK가 고정한 버전을 쓴다 (stripe v22 → 2026-03-25.dahlia 이후).
 */

let shared: { key: string; client: Stripe } | null = null;

export function getStripe(
  env: Record<string, string | undefined> = process.env,
): Stripe {
  const key = env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new PaymentError("CONFIGURATION_ERROR", {
      detail: "STRIPE_SECRET_KEY is not set.",
    });
  }
  // 공개 키(pk_)를 잘못 넣는 실수가 흔하다 — 비밀 키(sk_) 또는 제한 키(rk_)만 받는다
  if (!/^(sk|rk)_(test|live)_/.test(key)) {
    throw new PaymentError("CONFIGURATION_ERROR", {
      detail:
        "STRIPE_SECRET_KEY must be a secret key (sk_test_… or sk_live_…).",
    });
  }
  if (shared?.key !== key) {
    shared = {
      key,
      client: new Stripe(key, {
        // 네트워크 오류·409·5xx는 SDK가 멱등 키를 붙여 안전하게 다시 보낸다
        maxNetworkRetries: 2,
        timeout: 20_000,
      }),
    };
  }
  return shared.client;
}

export function getWebhookSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!secret?.startsWith("whsec_")) {
    throw new PaymentError("CONFIGURATION_ERROR", {
      detail:
        "STRIPE_WEBHOOK_SECRET must be set to the endpoint's whsec_… secret.",
    });
  }
  return secret;
}

/** 대시보드에 만든 상품(prod_…)이 있으면 결제 내역을 그 상품으로 모은다 (선택) */
export function getStripeProductId(
  env: Record<string, string | undefined> = process.env,
): string | undefined {
  const id = env.STRIPE_PRODUCT_ID?.trim();
  return id?.startsWith("prod_") ? id : undefined;
}

const CHECKOUT_SESSION_ID_PATTERN = /^cs_(test|live)_[A-Za-z0-9]{10,200}$/;

export function isCheckoutSessionId(value: unknown): value is string {
  return typeof value === "string" && CHECKOUT_SESSION_ID_PATTERN.test(value);
}

/** Stripe SDK 오류를 결제 오류로 바꾼다 (원문은 로그에만 남긴다) */
export function toStripeFailure(error: unknown): PaymentError {
  if (error instanceof PaymentError) return error;
  // 키·권한·요청 형식 문제(잘못된 상품 ID, live 모드의 http URL 등)는 다시 해도 낫지 않는다
  if (
    error instanceof Stripe.errors.StripeAuthenticationError ||
    error instanceof Stripe.errors.StripePermissionError ||
    error instanceof Stripe.errors.StripeInvalidRequestError
  ) {
    return new PaymentError("CONFIGURATION_ERROR", {
      detail: `Stripe ${error.type}: ${error.message}`,
      cause: error,
    });
  }
  if (error instanceof Stripe.errors.StripeError) {
    return new PaymentError("PAYMENT_UNAVAILABLE", {
      detail: `Stripe ${error.type}${error.statusCode ? ` ${error.statusCode}` : ""}: ${error.message}`,
      cause: error,
    });
  }
  return new PaymentError("PAYMENT_UNAVAILABLE", {
    detail: error instanceof Error ? error.message : String(error),
    cause: error,
  });
}
