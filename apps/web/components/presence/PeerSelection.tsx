"use client";

import { useNodePeers } from "@/lib/presence";

/** Coloured outline and name tag on a node that other people have selected. */
export function PeerSelection({ nodeId, rounded = "rounded-xl" }: { nodeId: string; rounded?: string }) {
  const peers = useNodePeers(nodeId);
  if (peers.length === 0) return null;
  const [first] = peers;
  const label = peers.length === 1 ? first!.user.name : `${first!.user.name} +${peers.length - 1}`;

  return (
    <div
      className={`pointer-events-none absolute -inset-1.5 border-2 ${rounded}`}
      style={{ borderColor: first!.user.color }}
      aria-hidden
    >
      <span
        className="absolute -top-5 left-0 rounded px-1.5 py-px text-[10px] font-medium whitespace-nowrap text-bg"
        style={{ background: first!.user.color }}
      >
        {label}
      </span>
    </div>
  );
}
