"use client";

import { usePeers, type Peer } from "@/lib/presence";

const MAX_SHOWN = 4;

/** Everyone else in the flow right now, one avatar per person (not per tab). */
export function PresenceAvatars() {
  const peers = usePeers();
  const people = [...new Map(peers.map((p) => [p.user.id, p] as [string, Peer])).values()];
  if (people.length === 0) return null;

  const shown = people.slice(0, MAX_SHOWN);
  const extra = people.length - shown.length;
  const names = people.map((p) => p.user.name).join(", ");

  return (
    <div className="mr-2 flex items-center -space-x-1.5" role="group" aria-label={`Also here: ${names}`} title={names}>
      {shown.map(({ user }) => (
        <span
          key={user.id}
          className="grid size-7 place-items-center rounded-full border-2 border-panel text-xs font-semibold uppercase text-bg"
          style={{ background: user.color }}
        >
          {user.name[0]}
        </span>
      ))}
      {extra > 0 && (
        <span className="grid size-7 place-items-center rounded-full border-2 border-panel bg-raised text-[10px] text-muted">
          +{extra}
        </span>
      )}
    </div>
  );
}
