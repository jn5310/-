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
      </main>
      <SiteFooter />
    </>
  );
}
