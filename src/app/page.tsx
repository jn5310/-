import { AdSlot } from "@/components/ads/ad-slot";
import { HeroSection } from "@/components/landing/hero-section";
import { ProcessSection } from "@/components/landing/process-section";
import { SealSection } from "@/components/landing/seal-section";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { StudioSection } from "@/components/landing/studio-section";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="main" className="flex-1">
        <HeroSection />
        <ProcessSection />
        <StudioSection />
        <SealSection />
        {/* 광고는 입력 폼(핵심 전환)과 떨어진 페이지 맨 아래에만 둔다 */}
        <AdSlot placement="landing" className="my-16 px-5 sm:px-8" />
      </main>
      <SiteFooter />
    </>
  );
}
