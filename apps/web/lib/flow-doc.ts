"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import { nanoid } from "nanoid";
import type { FlowEdge, FlowGraph, FlowNode } from "@flowcraft/flow-engine";
import { defaultConfig, getDefinition } from "@flowcraft/node-registry";

/**
 * The persistent graph lives in a Y.Doc so that concurrent edits (other tabs,
 * collaborators) merge instead of overwriting each other. React state holds a
 * projection of it plus per-user UI state (selection, measured size, dragging)
 * that must never be shared.
 */
export interface FlowDoc {
  doc: Y.Doc;
  nodes: Y.Map<FlowNode>;
  edges: Y.Map<FlowEdge>;
  undoManager: Y.UndoManager;
}

/** Transaction origin for this user's edits; only these are undoable. */
export const LOCAL_ORIGIN = "local";
/** Origin for state that came from the server; it is neither undoable nor saved back. */
export const REMOTE_ORIGIN = "remote";

export function createFlowDoc(doc = new Y.Doc()): FlowDoc {
  const nodes = doc.getMap<FlowNode>("nodes");
  const edges = doc.getMap<FlowEdge>("edges");
  const undoManager = new Y.UndoManager([nodes, edges], {
    trackedOrigins: new Set([LOCAL_ORIGIN]),
    captureTimeout: 400,
  });
  return { doc, nodes, edges, undoManager };
}

export function readGraph(flow: FlowDoc): FlowGraph {
  return { nodes: [...flow.nodes.values()], edges: [...flow.edges.values()] };
}

/** Replaces the whole graph, e.g. on import or when seeding an empty flow. */
export function replaceGraph(flow: FlowDoc, graph: FlowGraph, origin: unknown = LOCAL_ORIGIN) {
  flow.doc.transact(() => {
    flow.nodes.clear();
    flow.edges.clear();
    for (const node of graph.nodes) flow.nodes.set(node.id, node);
    for (const edge of graph.edges) flow.edges.set(edge.id, edge);
  }, origin);
}

function samePosition(a: XYPosition, b: XYPosition) {
  return a.x === b.x && a.y === b.y;
}

function projectNodes(stored: Iterable<FlowNode>, prev: Node[]): Node[] {
  const prevById = new Map(prev.map((n) => [n.id, n]));
  return Array.from(stored, (node) => {
    const p = prevById.get(node.id);
    if (!p) return { ...node };
    // Keep the previous object when nothing persistent changed so memoised
    // node components don't re-render.
    if (
      p.data === node.data &&
      p.type === node.type &&
      p.width === node.width &&
      p.height === node.height &&
      samePosition(p.position, node.position)
    ) {
      return p;
    }
    return { ...node, selected: p.selected, dragging: p.dragging, measured: p.measured };
  });
}

function projectEdges(stored: Iterable<FlowEdge>, prev: Edge[]): Edge[] {
  const prevById = new Map(prev.map((e) => [e.id, e]));
  return Array.from(stored, (edge) => {
    const p = prevById.get(edge.id);
    return p && p.source === edge.source && p.target === edge.target ? p : { ...edge, selected: p?.selected };
  });
}

export function useFlow(flow: FlowDoc, { readOnly = false }: { readOnly?: boolean } = {}) {
  const [nodes, setNodes] = useState<Node[]>(() => projectNodes(flow.nodes.values(), []));
  const [edges, setEdges] = useState<Edge[]>(() => projectEdges(flow.edges.values(), []));
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });

  useEffect(() => {
    const syncNodes = () => setNodes((prev) => projectNodes(flow.nodes.values(), prev));
    const syncEdges = () => setEdges((prev) => projectEdges(flow.edges.values(), prev));
    const syncHistory = () =>
      setHistory({ canUndo: flow.undoManager.canUndo(), canRedo: flow.undoManager.canRedo() });

    flow.nodes.observe(syncNodes);
    flow.edges.observe(syncEdges);
    flow.undoManager.on("stack-item-added", syncHistory);
    flow.undoManager.on("stack-item-popped", syncHistory);
    flow.undoManager.on("stack-cleared", syncHistory);
    syncNodes();
    syncEdges();
    return () => {
      flow.nodes.unobserve(syncNodes);
      flow.edges.unobserve(syncEdges);
      flow.undoManager.off("stack-item-added", syncHistory);
      flow.undoManager.off("stack-item-popped", syncHistory);
      flow.undoManager.off("stack-cleared", syncHistory);
    };
  }, [flow]);

  // Viewers can still select and pan, but nothing they do reaches the document.
  const transact = useCallback(
    (fn: () => void) => {
      if (!readOnly) flow.doc.transact(fn, LOCAL_ORIGIN);
    },
    [flow, readOnly],
  );

  const patchNode = useCallback(
    (id: string, patch: Partial<FlowNode>) => {
      const node = flow.nodes.get(id);
      if (node) flow.nodes.set(id, { ...node, ...patch });
    },
    [flow],
  );

  const removeNodes = useCallback(
    (ids: string[]) =>
      transact(() => {
        const removed = new Set(ids);
        for (const id of ids) flow.nodes.delete(id);
        // Edges attached to a removed node go with it.
        for (const [edgeId, edge] of flow.edges) {
          if (removed.has(edge.source) || removed.has(edge.target)) flow.edges.delete(edgeId);
        }
      }),
    [flow, transact],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => applyNodeChanges(changes, prev));
      const removed: string[] = [];
      transact(() => {
        for (const change of changes) {
          if (change.type === "position" && change.position) {
            patchNode(change.id, { position: change.position });
          } else if (change.type === "dimensions" && change.resizing && change.dimensions) {
            patchNode(change.id, change.dimensions);
          } else if (change.type === "remove") {
            removed.push(change.id);
          }
        }
      });
      if (removed.length > 0) removeNodes(removed);
    },
    [patchNode, removeNodes, transact],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((prev) => applyEdgeChanges(changes, prev));
      transact(() => {
        for (const change of changes) {
          if (change.type === "remove") flow.edges.delete(change.id);
        }
      });
    },
    [flow, transact],
  );

  const addEdge = useCallback(
    (connection: Connection) => {
      const id = nanoid(10);
      transact(() => flow.edges.set(id, { id, ...connection }));
    },
    [flow, transact],
  );

  const addNode = useCallback(
    (type: string, position: XYPosition) => {
      const definition = getDefinition(type);
      if (!definition) return;
      const id = nanoid(10);
      const size = definition.defaultSize;
      const node: FlowNode = {
        id,
        type,
        // Centre the node on the drop point.
        position: size ? { x: position.x - size.width / 2, y: position.y - size.height / 2 } : position,
        data: defaultConfig(definition),
        ...size,
      };
      transact(() => flow.nodes.set(id, node));
      return id;
    },
    [flow, transact],
  );

  const updateNodeData = useCallback(
    (id: string, patch: Record<string, unknown>) => {
      const node = flow.nodes.get(id);
      if (node) transact(() => patchNode(id, { data: { ...node.data, ...patch } }));
    },
    [flow, patchNode, transact],
  );

  const undo = useCallback(() => void (readOnly || flow.undoManager.undo()), [flow, readOnly]);
  const redo = useCallback(() => void (readOnly || flow.undoManager.redo()), [flow, readOnly]);

  return useMemo(
    () => ({
      flow,
      readOnly,
      nodes,
      edges,
      ...history,
      onNodesChange,
      onEdgesChange,
      addEdge,
      addNode,
      updateNodeData,
      removeNodes,
      undo,
      redo,
    }),
    [flow, readOnly, nodes, edges, history, onNodesChange, onEdgesChange, addEdge, addNode, updateNodeData, removeNodes, undo, redo],
  );
}

export type FlowApi = ReturnType<typeof useFlow>;
