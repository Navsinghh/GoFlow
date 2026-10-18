"use client";

import { Dialog } from "./Dialog";

interface Props {
  open: boolean;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Asks before a destructive action. Cancel gets focus so Enter can't delete by accident. */
export function ConfirmDialog({ open, title, description, confirmLabel, onConfirm, onCancel }: Props) {
  return (
    <Dialog open={open} onClose={onCancel} title={title}>
      <div className="text-sm leading-relaxed text-muted">{description}</div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          data-autofocus
          onClick={onCancel}
          className="rounded-lg border border-line px-4 py-2 text-sm transition hover:bg-raised"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-lg bg-danger px-4 py-2 text-sm font-medium text-white transition hover:brightness-110"
        >
          {confirmLabel}
        </button>
      </div>
    </Dialog>
  );
}
