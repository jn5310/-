import type { ReactNode } from "react";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Eyebrow } from "@/components/ui/eyebrow";
import { POLICY_UPDATED_AT } from "@/lib/site";

/** 개인정보처리방침·이용약관 공통 틀 */
export function LegalPage({
  title,
  hangul,
  children,
}: {
  title: string;
  hangul: string;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1 px-5 py-14 sm:px-8 lg:py-20">
        <article className="mx-auto flex max-w-3xl flex-col gap-8 text-ink-soft [&_a]:font-medium [&_a]:text-vermilion [&_a]:underline-offset-4 [&_a:hover]:underline [&_h2]:mt-4 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:text-ink [&_li]:leading-relaxed [&_p]:leading-relaxed [&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6">
          <header className="flex flex-col gap-3">
            <Eyebrow hangul={hangul}>{title}</Eyebrow>
            <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">
              {title}
            </h1>
            <p className="text-sm text-ink-muted">
              Last updated: {POLICY_UPDATED_AT}
            </p>
          </header>
          {children}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
