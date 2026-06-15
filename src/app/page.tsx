import {
  Hero,
  Manifesto,
  PartnerStrip,
  Pillars,
  PlatformSection,
  SiteFooter,
  SiteHeader,
  SmoothScroll,
  StatsGrid,
  UseCases
} from "@/components/Landing";

export default function Home() {
  return (
    <>
      <SmoothScroll />
      <main className="agent-landing">
        <SiteHeader />
        <Hero />
        <PartnerStrip />
        <PlatformSection />
        <StatsGrid />
        <Pillars />
        <Manifesto />
        <UseCases />
        <SiteFooter />
      </main>
    </>
  );
}
