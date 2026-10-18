import { CircleAlert, CircleCheck } from "lucide-react";
import { cn } from "@/lib/cn";

export type NoticeValue = { kind: "success" | "error"; text: string } | null;

/**
 * Inline feedback for forms inside dialogs. Toasts render beneath a modal
 * <dialog>'s top layer (and its blurred backdrop), so dialogs report here.
 */
export function Notice({ notice, className }: { notice: NoticeValue; className?: string }) {
  if (!notice) return null;
  const success = notice.kind === "success";
  const Icon = success ? CircleCheck : CircleAlert;
  return (
    <p
      role={success ? "status" : "alert"}
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-sm",
        success ? "bg-ok/10 text-ok" : "bg-danger/10 text-danger",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" />
      {notice.text}
    </p>
  );
}
