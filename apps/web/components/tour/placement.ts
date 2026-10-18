export type Placement = "right" | "left" | "bottom" | "top" | "center" | "inside-bottom";

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

const GAP = 16;
const MARGIN = 16;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function fits(pos: { x: number; y: number }, card: Box, viewport: Box) {
  return (
    pos.x >= MARGIN &&
    pos.y >= MARGIN &&
    pos.x + card.width <= viewport.width - MARGIN &&
    pos.y + card.height <= viewport.height - MARGIN
  );
}

/**
 * Where to put the tour card next to its target. Tries the preferred side,
 * then the others, and finally centres the card; the result is always kept
 * inside the viewport.
 */
export function placeCard(
  target: Box | null,
  card: Pick<Box, "width" | "height">,
  viewport: Pick<Box, "width" | "height">,
  preferred: Placement,
): { x: number; y: number } {
  const c = { x: 0, y: 0, ...card };
  const v = { x: 0, y: 0, ...viewport };
  const centered = { x: (v.width - c.width) / 2, y: (v.height - c.height) / 2 };
  if (!target || preferred === "center") return centered;

  const midY = target.y + target.height / 2 - c.height / 2;
  const midX = target.x + target.width / 2 - c.width / 2;
  const candidates: Record<Exclude<Placement, "center">, { x: number; y: number }> = {
    right: { x: target.x + target.width + GAP, y: midY },
    left: { x: target.x - c.width - GAP, y: midY },
    bottom: { x: midX, y: target.y + target.height + GAP },
    top: { x: midX, y: target.y - c.height - GAP },
    "inside-bottom": { x: midX, y: target.y + target.height - c.height - GAP * 1.5 },
  };

  const order = [preferred, "right", "left", "bottom", "top"] as const;
  for (const side of order) {
    const raw = candidates[side as keyof typeof candidates];
    // Slide along the edge to fit, but never across the target.
    const pos =
      side === "right" || side === "left"
        ? { x: raw.x, y: clamp(raw.y, MARGIN, v.height - c.height - MARGIN) }
        : { x: clamp(raw.x, MARGIN, v.width - c.width - MARGIN), y: raw.y };
    if (fits(pos, c, v)) return pos;
  }
  return centered;
}
