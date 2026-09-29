import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { formatPrice, PREMIUM_OFFER } from "@/lib/pricing";
import { pageMetadata } from "@/lib/seo/metadata";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

/*
 * 이용약관·환불 정책 초안 — Stripe 계정 심사에는 환불 정책과 고객 문의처가 사이트에 있어야 한다.
 * 환불 조건은 사업 정책에 맞게 고치고, 운영 전에 법률 검토를 받는다.
 */

export const metadata: Metadata = pageMetadata({
  title: "Terms & Refunds",
  description: `Terms of use and refund policy for ${SITE_NAME}.`,
  path: "/terms",
});

export default function TermsPage() {
  const price = formatPrice(PREMIUM_OFFER);
  return (
    <LegalPage title="Terms & Refunds" hangul="이용약관 · 환불">
      <p>
        By using {SITE_NAME} you agree to these terms. If you don’t agree,
        please don’t use the service.
      </p>

      <h2>The service</h2>
      <ul>
        <li>
          {SITE_NAME} suggests Korean names inspired by Saju (the Four Pillars
          of Destiny). Readings are for cultural interest and personal use.
        </li>
        <li>
          Names and analysis are generated with the help of AI. They are not
          professional, legal or official advice, and a suggested name is not a
          legal name registration.
        </li>
      </ul>

      <h2>Premium readings</h2>
      <ul>
        <li>
          A premium reading costs {price} (USD) as a one-time payment. There is
          no subscription and nothing renews.
        </li>
        <li>
          It unlocks all suggested names, the full Saju and Hanja analysis, a
          seal image (PNG) and a name certificate (PDF) for that reading, ad
          free.
        </li>
        <li>
          Payments are processed securely by Stripe. Access is delivered
          instantly on the reading’s page and remains available for about a
          year.
        </li>
      </ul>

      <h2>Refunds</h2>
      <ul>
        <li>
          If you were charged but your reading didn’t unlock, or you were
          charged twice for the same reading, we’ll refund you in full.
        </li>
        <li>
          For any other issue, email us within 14 days of your purchase and
          we’ll review your request.
        </li>
        <li>
          Include the link to your reading so we can find your purchase quickly.
        </li>
      </ul>

      <h2>Your use</h2>
      <ul>
        <li>
          You may use your name, seal and certificate for personal purposes,
          including sharing them online.
        </li>
        <li>
          Don’t misuse the service — for example by overloading it,
          reverse-engineering it or submitting offensive content.
        </li>
      </ul>

      <h2>Liability</h2>
      <p>
        The service is provided “as is”. To the extent the law allows, our total
        liability for any claim is limited to the amount you paid for the
        reading concerned.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The date at the top shows the latest version.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or refund requests:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
