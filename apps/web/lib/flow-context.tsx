"use client";

import { createContext, useContext, useMemo } from "react";
import type { FlowApi } from "./flow-doc";

type FlowActions = Pick<FlowApi, "flow" | "readOnly" | "addNode" | "updateNodeData" | "removeNodes" | "undo" | "redo">;

// Actions are stable across renders; node components read only these so a
// drag elsewhere on the canvas doesn't re-render them.
const ActionsContext = createContext<FlowActions | null>(null);
const StateContext = createContext<FlowApi | null>(null);

export function FlowProvider({ api, children }: { api: FlowApi; children: React.ReactNode }) {
  const { flow, readOnly, addNode, updateNodeData, removeNodes, undo, redo } = api;
  const actions = useMemo(
    () => ({ flow, readOnly, addNode, updateNodeData, removeNodes, undo, redo }),
    [flow, readOnly, addNode, updateNodeData, removeNodes, undo, redo],
  );
  return (
    <ActionsContext.Provider value={actions}>
      <StateContext.Provider value={api}>{children}</StateContext.Provider>
    </ActionsContext.Provider>
  );
}

export function useFlowActions(): FlowActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error("useFlowActions must be used inside <FlowProvider>");
  return actions;
}

export function useFlowState(): FlowApi {
  const state = useContext(StateContext);
  if (!state) throw new Error("useFlowState must be used inside <FlowProvider>");
  return state;
}
