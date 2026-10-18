"use client";

import { useViewport, ViewportPortal } from "@xyflow/react";
import { usePeers } from "@/lib/presence";

/** Other people's pointers, drawn in flow coordinates so they track pan and zoom. */
export function LiveCursors() {
  const peers = usePeers();
  const { zoom } = useViewport();

  return (
    <ViewportPortal>
      {peers.map(({ clientId, user, cursor }) =>
        cursor ? (
          <div
            key={clientId}
            className="pointer-events-none absolute top-0 left-0 z-[1000] origin-top-left transition-transform duration-75 ease-linear"
            // Counter the zoom so cursors stay the same size on screen.
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px) scale(${1 / zoom})` }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M4 2.5 L4 19.5 L8.6 15.2 L11.6 21.8 L14.4 20.6 L11.5 14.1 L17.8 14.1 Z"
                fill={user.color}
                stroke="#011627"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="ml-3 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-bg"
              style={{ background: user.color }}
            >
              {user.name}
            </span>
          </div>
        ) : null,
      )}
    </ViewportPortal>
  );
}
