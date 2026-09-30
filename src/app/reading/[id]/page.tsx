import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { ReadingExperience } from "@/components/reading/reading-experience";
import { isPaywallEnabled } from "@/lib/monetization";
import { DEFAULT_SOCIAL_IMAGE, twitterCard } from "@/lib/seo/metadata";
import { SITE_LOCALE, SITE_NAME } from "@/lib/site";
import { isReadingId, loadReading } from "@/server/readings/repository";
import { getReadingView } from "@/server/readings/service";

/**
 * 동적 제목·설명 — 한국 이름(한글·로마자)과 한 줄 의미만 쓴다.
 * 영문 본명·생년월일은 넣지 않고, 무료 풀이는 결제 전이라 한자도 넣지 않는다.
 * 개인 풀이 페이지라 검색 결과에는 올리지 않는다 (링크를 공유하면 카드 미리보기만 보인다).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const loaded = isReadingId(id)
    ? await loadReading(id).catch(() => null)
    : null;
  const first = loaded?.reading.result.names[0];

  const title = first
    ? `${first.hangul} (${first.romanization}) — Korean name reading`
    : "Your Korean name reading";
  const fullReading =
    Boolean(loaded?.entitlement || loaded?.reading.openAccess) ||
    !isPaywallEnabled();
  const description = !first
    ? "A Korean name crafted from a Saju birth chart."
    : fullReading
      ? `Three Korean names crafted from a Saju chart, starting with ${first.hangul} (${first.romanization}) — with Hanja meanings, a Korean seal and a name certificate.`
      : `“${first.summary}” See the meaning of ${first.hangul} (${first.romanization}) and two more names from the same Saju chart.`;
  const socialTitle = `${title} · ${SITE_NAME}`;

  return {
    title,
    description,
    robots: { index: false, follow: false, nocache: true },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      title: socialTitle,
      description,
      images: [DEFAULT_SOCIAL_IMAGE],
    },
    twitter: twitterCard(socialTitle, description),
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

const firstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * /reading/[id] — 이름 풀이 결과 페이지.
 * 입력 폼 제출 후, 그리고 Stripe 결제 후(success_url · cancel_url) 돌아오는 곳이다.
 */
export default async function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!isReadingId(id)) notFound();

  // 무료 개방 중에는 결제 복귀 매개변수를 무시한다 (결제 완료·취소 안내가 뜨지 않게)
  const checkoutParam = isPaywallEnabled() ? firstValue(query.checkout) : null;
  const checkout =
    checkoutParam === "success" || checkoutParam === "cancelled"
      ? checkoutParam
      : null;
  const sessionId =
    checkout === "success" ? (firstValue(query.session_id) ?? null) : null;

  // 결제 복귀면 Stripe에서 결제를 확인하고, 확인되면 바로 열린 풀이를 그린다
  const view = await getReadingView(id, { sessionId });
  if (!view) notFound();

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-5 py-12 sm:px-8 lg:py-16">
        <div className="mx-auto max-w-6xl">
          <ReadingExperience
            initialView={view}
            checkout={checkout}
            sessionId={sessionId}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
