import { NavBar } from "@/components/landing/NavBar";
import { HeroSection } from "@/components/landing/HeroSection";
import { JourneySection } from "@/components/landing/JourneySection";
import { MonitorSection } from "@/components/landing/MonitorSection";
import { ArchitectureSection } from "@/components/landing/ArchitectureSection";
import { HealthSection } from "@/components/landing/HealthSection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <NavBar />
      <main>
        <HeroSection />
        <JourneySection />
        <MonitorSection />
        <ArchitectureSection />
        <HealthSection />
      </main>
      <Footer />
    </>
  );
}
