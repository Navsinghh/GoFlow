import Link from "next/link";
import { APP_VERSION } from "@/lib/version";

/** The "flowcraft" wordmark with its version badge; a link when `href` is given. */
export function Brand({ href }: { href?: string }) {
  const content = (
    <>
      <span className="font-mono text-sm text-accent">flowcraft</span>
      <span className="rounded-full border border-accent/40 bg-accent/10 px-1.5 py-px font-mono text-[10px] leading-4 font-medium text-accent">
        {APP_VERSION}
      </span>
    </>
  );
  return href ? (
    <Link href={href} className="flex items-center gap-1.5" aria-label={`Flowcraft ${APP_VERSION} home`}>
      {content}
    </Link>
  ) : (
    <span className="flex items-center gap-1.5">{content}</span>
  );
}
