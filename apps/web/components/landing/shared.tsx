import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-accent px-5 py-3 font-medium text-bg shadow-[0_10px_30px_-10px_rgb(0_163_255/0.7)] transition hover:brightness-110";
export const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-panel/70 px-5 py-3 font-medium text-fg backdrop-blur transition hover:border-accent/40 hover:bg-raised";

/** "Get started": the dashboard once signed in, otherwise sign-in. */
export function StartLink({ signedIn }: { signedIn: boolean }) {
  return (
    <Link href={signedIn ? "/dashboard" : "/sign-in"} className={primaryButton}>
      {signedIn ? "Open your flows" : "Get started free"}
      <ArrowRight className="size-4" />
    </Link>
  );
}

export function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-xs tracking-[0.2em] text-accent uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h2>
      {children && <p className="mt-4 text-lg text-pretty text-muted">{children}</p>}
    </div>
  );
}

export function GradientText({ children }: { children: React.ReactNode }) {
  return <span className="bg-linear-to-r from-accent via-[#5ccfff] to-port-text bg-clip-text text-transparent">{children}</span>;
}
