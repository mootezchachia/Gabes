import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Crisis } from "@/components/landing/Crisis";
import { Platform } from "@/components/landing/Platform";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Crisis />
        <Platform />
      </main>
      <Footer />
    </>
  );
}
