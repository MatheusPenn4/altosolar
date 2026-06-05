import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/WhatsAppFloat";
import { MobileCTABar } from "@/components/layout/MobileCTABar";

import { Hero } from "@/components/sections/Hero";
import { SocialProof } from "@/components/sections/SocialProof";
import { Trust } from "@/components/sections/Trust";
import { CoverageMap } from "@/components/sections/CoverageMap";
import { Stats } from "@/components/sections/Stats";
import { Calculator } from "@/components/sections/Calculator";
import { Results } from "@/components/sections/Results";
import { Benefits } from "@/components/sections/Benefits";
import { HowItWorks } from "@/components/sections/HowItWorks";
import { Projects } from "@/components/sections/Projects";
import { Comparison } from "@/components/sections/Comparison";
import { Testimonials } from "@/components/sections/Testimonials";
import { About } from "@/components/sections/About";
import { FAQ } from "@/components/sections/FAQ";
import { FinalCTA } from "@/components/sections/FinalCTA";

export default function Home() {
  return (
    <>
      <Header />
      <main className="pb-[76px] lg:pb-0">
        <Hero />
        <SocialProof />
        <Trust />
        <CoverageMap />
        <Stats />
        <Calculator />
        <Results />
        <Benefits />
        <HowItWorks />
        <Projects />
        <Comparison />
        <Testimonials />
        <About />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
      <WhatsAppFloat />
      <MobileCTABar />
    </>
  );
}
