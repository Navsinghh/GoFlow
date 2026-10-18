"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Unlink } from "lucide-react";
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import { definitions, getDefinition } from "@flowcraft/node-registry";
import { normalizeConnection } from "@/lib/connections";
import { usePresence } from "@/lib/presence";
import { LiveCursors } from "@/components/presence/LiveCursors";
import { useFlowState } from "@/lib/flow-context";
import { CanvasStats } from "./CanvasStats";
import { ContextMenu, type MenuItem } from "./ContextMenu";
import { nodeDisplayName } from "@/lib/node-name";
import { DRAG_MIME } from "./Palette";
import { ShapeNode } from "./ShapeNode";
import { WorkflowNode } from "./WorkflowNode";

const nodeTypes: NodeTypes = Object.fromEntries(
  definitions.map((d) => [d.type, d.mode === "workflow" ? WorkflowNode : ShapeNode]),
);

const defaultEdgeOptions = {
  animated: true,
  markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 },
};

function minimapColor(node: Node) {
  return getDefinition(node.type ?? "")?.mode === "workflow" ? "#00a3ff" : "#5b6b8c";
}

export function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, addEdge, addNode, removeNodes, readOnly } = useFlowState();
  const presence = usePresence();
  const { screenToFlowPosition, fitView } = useReactFlow();

  // Frame the flow once, after every node is measured (the `fitView` prop can
  // fire too early). An empty flow is left at the default zoom.
  const nodesInitialized = useNodesInitialized();
  const fitted = useRef(nodes.length === 0);
  useEffect(() => {
    if (!nodesInitialized || fitted.current) return;
    fitted.current = true;
    void fitView({ padding: 0.15, maxZoom: 1 });
  }, [nodesInitialized, fitView]);

  const isValidConnection = useCallback(
    (connection: Connection | Edge) => normalizeConnection(connection, nodes, edges) !== null,
    [nodes, edges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const normalized = normalizeConnection(connection, nodes, edges);
      if (normalized) addEdge(normalized);
    },
    [nodes, edges, addEdge],
  );

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const type = event.dataTransfer.getData(DRAG_MIME);
      if (type) addNode(type, screenToFlowPosition({ x: event.clientX, y: event.clientY }));
    },
    [addNode, screenToFlowPosition],
  );

  // Share this user's selection and pointer with collaborators.
  const selectionKey = nodes
    .filter((n) => n.selected)
    .map((n) => n.id)
    .join(",");
  useEffect(() => {
    presence?.setLocal("selection", selectionKey ? selectionKey.split(",") : []);
  }, [presence, selectionKey]);

  const pendingPointer = useRef<number | null>(null);
  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!presence || pendingPointer.current !== null) return;
      const { clientX, clientY } = event;
      // At most one awareness update per frame.
      pendingPointer.current = requestAnimationFrame(() => {
        pendingPointer.current = null;
        presence.setLocal("cursor", screenToFlowPosition({ x: clientX, y: clientY }));
      });
    },
    [presence, screenToFlowPosition],
  );
  const onPointerLeave = useCallback(() => {
    if (pendingPointer.current !== null) cancelAnimationFrame(pendingPointer.current);
    pendingPointer.current = null;
    presence?.setLocal("cursor", null);
  }, [presence]);

  // Right-click menus. The clicked item is selected too, so it's clear what the menu acts on.
  const [menu, setMenu] = useState<{ x: number; y: number; title: string; items: MenuItem[] } | null>(null);
  const closeMenu = useCallback(() => setMenu(null), []);

  const disconnect = useCallback(
    (edgeIds: string[]) => onEdgesChange(edgeIds.map((id) => ({ type: "remove" as const, id }))),
    [onEdgesChange],
  );

  const selectOnly = useCallback(
    (target: { node?: string; edge?: string }) => {
      onNodesChange(nodes.map((n) => ({ type: "select" as const, id: n.id, selected: n.id === target.node })));
      onEdgesChange(edges.map((e) => ({ type: "select" as const, id: e.id, selected: e.id === target.edge })));
    },
    [nodes, edges, onNodesChange, onEdgesChange],
  );

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      event.preventDefault();
      if (readOnly) return;
      selectOnly({ edge: edge.id });
      const from = nodeDisplayName(nodes.find((n) => n.id === edge.source)) ?? "node";
      const to = nodeDisplayName(nodes.find((n) => n.id === edge.target)) ?? "node";
      setMenu({
        x: event.clientX,
        y: event.clientY,
        title: `${from} → ${to}`,
        items: [{ label: "Disconnect", icon: Unlink, danger: true, onSelect: () => disconnect([edge.id]) }],
      });
    },
    [readOnly, nodes, selectOnly, disconnect],
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      if (readOnly) return;
      selectOnly({ node: node.id });
      const attached = edges.filter((e) => e.source === node.id || e.target === node.id).map((e) => e.id);
      setMenu({
        x: event.clientX,
        y: event.clientY,
        title: nodeDisplayName(node) ?? "Node",
        items: [
          {
            label: attached.length > 0 ? `Disconnect all (${attached.length})` : "No connections",
            icon: Unlink,
            disabled: attached.length === 0,
            onSelect: () => disconnect(attached),
          },
          { label: "Delete node", icon: Trash2, danger: true, onSelect: () => removeNodes([node.id]) },
        ],
      });
    },
    [readOnly, edges, selectOnly, disconnect, removeNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <>
      <ReactFlow
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesReconnectable={false}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        isValidConnection={isValidConnection}
        connectionMode={ConnectionMode.Loose}
        defaultEdgeOptions={defaultEdgeOptions}
        onDrop={readOnly ? undefined : onDrop}
        onDragOver={readOnly ? undefined : onDragOver}
        snapToGrid
        snapGrid={[10, 10]}
        deleteKeyCode={readOnly ? null : ["Backspace", "Delete"]}
        onEdgeContextMenu={onEdgeContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onPaneContextMenu={(event) => {
          event.preventDefault();
          closeMenu();
        }}
        onMoveStart={closeMenu}
        colorMode="dark"
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} />
        <Controls />
        <MiniMap nodeColor={minimapColor} pannable zoomable />
        <LiveCursors />
        <CanvasStats />
      </ReactFlow>
      {menu && <ContextMenu {...menu} onClose={closeMenu} />}
    </>
  );
}
