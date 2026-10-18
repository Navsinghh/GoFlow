import type { FlowSnapshot } from "@flowcraft/db/schema";
import { getDefinition } from "@flowcraft/node-registry";

// Workflow nodes size to their content, so the snapshot has no size for them.
const WORKFLOW_NODE = { width: 280, height: 150 };
const PADDING = 40;

/** Static thumbnail of a flow drawn from its snapshot. */
export function FlowPreview({ snapshot }: { snapshot: FlowSnapshot }) {
  if (snapshot.nodes.length === 0) {
    return <div className="grid size-full place-items-center text-xs text-muted">Empty flow</div>;
  }

  const boxes = new Map(
    snapshot.nodes.map((n) => {
      const definition = getDefinition(n.type);
      const size = definition?.mode === "workflow" ? WORKFLOW_NODE : { width: n.width ?? 160, height: n.height ?? 80 };
      return [n.id, { ...n.position, ...size, workflow: definition?.mode === "workflow", shape: definition?.shape }];
    }),
  );
  const all = [...boxes.values()];
  const minX = Math.min(...all.map((b) => b.x)) - PADDING;
  const minY = Math.min(...all.map((b) => b.y)) - PADDING;
  const width = Math.max(...all.map((b) => b.x + b.width)) - minX + PADDING;
  const height = Math.max(...all.map((b) => b.y + b.height)) - minY + PADDING;

  return (
    <svg viewBox={`${minX} ${minY} ${width} ${height}`} className="size-full" aria-hidden>
      {snapshot.edges.map((e, i) => {
        const a = boxes.get(e.source);
        const b = boxes.get(e.target);
        if (!a || !b) return null;
        return (
          <line
            key={i}
            x1={a.x + a.width / 2}
            y1={a.y + a.height / 2}
            x2={b.x + b.width / 2}
            y2={b.y + b.height / 2}
            stroke="#4f7aa3"
            strokeWidth={Math.max(width, height) / 200}
          />
        );
      })}
      {all.map((b, i) =>
        b.shape === "diamond" ? (
          <polygon
            key={i}
            points={`${b.x + b.width / 2},${b.y} ${b.x + b.width},${b.y + b.height / 2} ${b.x + b.width / 2},${b.y + b.height} ${b.x},${b.y + b.height / 2}`}
            fill="#10304d"
            stroke="#5b6b8c"
            strokeWidth={2}
          />
        ) : (
          <rect
            key={i}
            x={b.x}
            y={b.y}
            width={b.width}
            height={b.height}
            rx={b.shape === "ellipse" || b.shape === "rounded" ? Math.min(b.width, b.height) / 2 : 12}
            fill={b.workflow ? "#0a2238" : b.shape === "sticky" ? "#e8c547" : "#10304d"}
            stroke={b.workflow ? "#00a3ff" : "#5b6b8c"}
            strokeWidth={2}
          />
        ),
      )}
    </svg>
  );
}
