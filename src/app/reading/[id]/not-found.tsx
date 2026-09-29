import Link from "next/link";

import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { primaryButtonClass } from "@/components/ui/styles";
import { isPaywallEnabled, READING_RETENTION_DAYS } from "@/lib/monetization";

export default function ReadingNotFound() {
  const retention = isPaywallEnabled()
    ? `Free previews are kept for ${READING_RETENTION_DAYS.standard} days and unlocked readings for a year.`
    : `Readings are kept for ${READING_RETENTION_DAYS.standard} days.`;
  return (
    <>
      <SiteHeader />
      <main
        id="main"
        className="grid flex-1 place-items-center px-5 py-24 sm:px-8"
      >
        <div className="flex max-w-md flex-col items-center gap-5 text-center">
          <span
            aria-hidden="true"
            lang="ko"
            className="font-serif text-7xl leading-none text-vermilion/30"
          >
            無
          </span>
          <h1 className="font-serif text-3xl font-semibold text-ink">
            We couldn’t find this reading
          </h1>
          <p className="leading-relaxed text-ink-soft">
            {retention} It only takes a minute to create a new one.
          </p>
          <Link href="/#studio" className={primaryButtonClass}>
            Create my Korean name
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
