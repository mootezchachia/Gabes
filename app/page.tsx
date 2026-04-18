import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Crisis } from "@/components/landing/Crisis";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Platform } from "@/components/landing/Platform";
import { Audiences } from "@/components/landing/Audiences";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Crisis />
        <HowItWorks />
        <Platform />
        <Audiences />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
