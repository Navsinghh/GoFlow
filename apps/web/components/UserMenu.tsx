"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const label = name || email;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid size-8 place-items-center rounded-full bg-raised text-sm font-medium uppercase ring-accent/40 transition hover:ring-2"
      >
        {label[0]}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-60 rounded-lg border border-line bg-panel p-1 shadow-xl shadow-black/40">
          <div className="px-3 py-2">
            {name && <p className="truncate text-sm">{name}</p>}
            <p className="truncate text-xs text-muted">{email}</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <button
            role="menuitem"
            type="button"
            onClick={async () => {
              await authClient.signOut();
              router.replace("/");
              router.refresh();
            }}
            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted transition hover:bg-raised hover:text-fg"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
