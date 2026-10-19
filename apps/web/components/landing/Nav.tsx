import Link from "next/link";
import { Brand } from "@/components/Brand";

const sections = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#under-the-hood", label: "Under the hood" },
  { href: "#roadmap", label: "Roadmap" },
];

const primary = "rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-bg transition hover:brightness-110";

export function Nav({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-50 border-b border-line/60 bg-bg/75 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-8 px-4 sm:px-6">
        <Brand href="/" />
        <nav aria-label="Sections" className="hidden items-center gap-6 text-sm text-muted md:flex">
          {sections.map(({ href, label }) => (
            <a key={href} href={href} className="transition hover:text-fg">
              {label}
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {signedIn ? (
            <Link href="/dashboard" className={primary}>
              Your flows
            </Link>
          ) : (
            <>
              <Link href="/sign-in" className="hidden rounded-lg px-3 py-1.5 text-sm text-muted transition hover:text-fg sm:block">
                Sign in
              </Link>
              <Link href="/sign-in" className={primary}>
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
