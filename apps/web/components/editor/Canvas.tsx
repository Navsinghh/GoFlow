"use client";

import { useCallback, useEffect, useRef } from "react";
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
import { useFlowState } from "@/lib/flow-context";
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
  const { nodes, edges, onNodesChange, onEdgesChange, addEdge, addNode } = useFlowState();
  const { screenToFlowPosition, fitView } = useReactFlow();

  // The `fitView` prop can fire before every node is measured; wait for all of them.
  const nodesInitialized = useNodesInitialized();
  const fitted = useRef(false);
  useEffect(() => {
    if (!nodesInitialized || fitted.current) return;
    fitted.current = true;
    void fitView({ padding: 0.15 });
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

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      isValidConnection={isValidConnection}
      connectionMode={ConnectionMode.Loose}
      defaultEdgeOptions={defaultEdgeOptions}
      onDrop={onDrop}
      onDragOver={onDragOver}
      snapToGrid
      snapGrid={[10, 10]}
      deleteKeyCode={["Backspace", "Delete"]}
      colorMode="dark"
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} gap={24} size={1.5} />
      <Controls />
      <MiniMap nodeColor={minimapColor} pannable zoomable />
    </ReactFlow>
  );
}
