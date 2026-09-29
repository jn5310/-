import type { Metadata } from "next";

import { LegalPage } from "@/components/legal/legal-page";
import { SITE_NAME, SUPPORT_EMAIL } from "@/lib/site";

/*
 * 개인정보처리방침 — 실제 구현(저장 항목·보존 기간·외부 서비스)에 맞춘 초안이다.
 * 운영 전에 사업자 정보·관할 법령(GDPR·CCPA·한국 개인정보보호법 등)에 맞게 법률 검토를 받는다.
 */

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE_NAME} handles your details, payments and advertising cookies.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" hangul="개인정보처리방침">
      <p>
        {SITE_NAME} creates Korean names from the details you share with us.
        This policy explains what we collect, why, who we share it with and how
        long we keep it.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Reading details</strong> — your English name, gender, surname
          choice, birth date, birth time (optional) and birth time zone.
        </li>
        <li>
          <strong>Your reading</strong> — the names and analysis we generate,
          saved under a private, unguessable link.
        </li>
        <li>
          <strong>Payment status</strong> — when you buy a premium reading,
          Stripe processes the payment. We receive the payment status and
          amount, never your card number.
        </li>
        <li>
          <strong>Technical data</strong> — basic server logs (such as request
          IDs and error codes) that do not include your name or birth details.
        </li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>
          To calculate your Saju chart and generate names. Your reading details
          are sent to Google’s Gemini API, which processes them to write the
          names and analysis.
        </li>
        <li>To show your reading again when you revisit your link.</li>
        <li>To unlock your premium reading after payment.</li>
      </ul>

      <h2>Advertising and cookies</h2>
      <p>
        Free pages of {SITE_NAME} may show ads served by Google AdSense. Premium
        readings are ad-free. Google and other third-party vendors use cookies
        to serve ads based on your previous visits to this and other websites.
        Google’s advertising cookies let it and its partners show you ads based
        on those visits.
      </p>
      <ul>
        <li>
          You can turn off personalized advertising in{" "}
          <a
            href="https://adssettings.google.com"
            rel="noopener noreferrer"
            target="_blank"
          >
            Google Ads Settings
          </a>
          , or opt out of some third-party vendors’ cookies at{" "}
          <a
            href="https://www.aboutads.info/choices"
            rel="noopener noreferrer"
            target="_blank"
          >
            aboutads.info
          </a>
          .
        </li>
        <li>
          Learn{" "}
          <a
            href="https://policies.google.com/technologies/partner-sites"
            rel="noopener noreferrer"
            target="_blank"
          >
            how Google uses information from sites that use its services
          </a>
          .
        </li>
        <li>
          Visitors in the European Economic Area, the UK and Switzerland are
          asked for consent before personalized ads are shown.
        </li>
      </ul>

      <h2>Who we share it with</h2>
      <ul>
        <li>Google (Gemini API) — to generate your names.</li>
        <li>Stripe — to process payments.</li>
        <li>Google AdSense — to show ads on free pages.</li>
        <li>
          Google Fonts — our server requests the Korean characters of your new
          name so your certificate can be printed in the right typeface. Your
          English name and birth details are not sent.
        </li>
        <li>Our hosting and database providers — to run the service.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Free previews are deleted automatically after 30 days.</li>
        <li>
          Unlocked readings are kept for about a year so you can come back and
          download your seal and certificate.
        </li>
      </ul>

      <h2>Your choices</h2>
      <p>
        You can ask us to delete your reading at any time. Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with the link to
        your reading. Depending on where you live, you may also have rights to
        access, correct or object to the use of your data.
      </p>

      <h2>Children</h2>
      <p>
        {SITE_NAME} is not directed to children under 13, and we do not
        knowingly collect their information.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about privacy? Email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
