"use client";

import { useCallback } from "react";
import { useReactFlow } from "@xyflow/react";
import { useFlowState } from "./flow-context";

/** Selects the given nodes and smoothly brings them into view. Unknown ids are ignored. */
export function useFocusNodes() {
  const { nodes, onNodesChange } = useFlowState();
  const { fitView } = useReactFlow();

  return useCallback(
    (ids: string[]) => {
      const present = ids.filter((id) => nodes.some((n) => n.id === id));
      if (present.length === 0) return;
      onNodesChange(nodes.map((n) => ({ type: "select" as const, id: n.id, selected: present.includes(n.id) })));
      void fitView({ nodes: present.map((id) => ({ id })), duration: 400, maxZoom: 1.2, padding: 0.4 });
    },
    [nodes, onNodesChange, fitView],
  );
}
