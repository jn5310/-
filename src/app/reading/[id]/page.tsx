import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { ReadingExperience } from "@/components/reading/reading-experience";
import { isReadingId } from "@/server/readings/repository";
import { getReadingView } from "@/server/readings/service";

export const metadata: Metadata = {
  title: "Your Korean name reading",
  // 개인 풀이 페이지 — 검색에 노출하지 않는다
  robots: { index: false, follow: false },
};

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

  const checkoutParam = firstValue(query.checkout);
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
