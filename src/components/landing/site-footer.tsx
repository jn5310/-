import Link from "next/link";

import { SealMark } from "@/components/ui/seal-mark";
import { SUPPORT_EMAIL } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-hanji/60">
      <div aria-hidden="true" className="saekdong h-1 opacity-80" />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-sm text-ink-muted sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 font-medium text-ink">
            <SealMark className="size-7 text-sm" />
            K-Name Studio
          </p>
          <p className="max-w-md leading-relaxed">
            Korean names for cultural and personal use — not an official legal
            name registration.
          </p>
        </div>
        <nav aria-label="Legal">
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            <li>
              <Link
                href="/privacy"
                className="transition-colors hover:text-vermilion"
              >
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link
                href="/terms"
                className="transition-colors hover:text-vermilion"
              >
                Terms &amp; Refunds
              </Link>
            </li>
            <li>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="transition-colors hover:text-vermilion"
              >
                {SUPPORT_EMAIL}
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}
