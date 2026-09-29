import { SealMark } from "@/components/ui/seal-mark";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink/10 bg-hanji/60">
      <div aria-hidden="true" className="saekdong h-1 opacity-80" />
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-10 text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="flex items-center gap-3 font-medium text-ink">
          <SealMark className="size-7 text-sm" />
          K-Name Studio
        </p>
        <p className="max-w-md leading-relaxed">
          Korean names for cultural and personal use — not an official legal
          name registration.
        </p>
      </div>
    </footer>
  );
}
