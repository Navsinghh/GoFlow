import { WakeCollab } from "@/components/WakeCollab";
import { FinalCta, Footer } from "@/components/landing/Closing";
import { Features } from "@/components/landing/Features";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Nav } from "@/components/landing/Nav";
import { Roadmap } from "@/components/landing/Roadmap";
import { UnderTheHood } from "@/components/landing/UnderTheHood";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const signedIn = Boolean(await getSession());
  return (
    <div data-page-scroll className="min-h-full overflow-x-clip">
      <WakeCollab />
      <Nav signedIn={signedIn} />
      <main>
        <Hero signedIn={signedIn} />
        <Features />
        <HowItWorks />
        <UnderTheHood />
        <Roadmap />
        <FinalCta signedIn={signedIn} />
      </main>
      <Footer />
    </div>
  );
}
