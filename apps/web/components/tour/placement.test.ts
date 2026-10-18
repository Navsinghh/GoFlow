import { describe, expect, it } from "vitest";
import { placeCard } from "./placement";

const viewport = { width: 1440, height: 900 };
const card = { width: 340, height: 200 };

describe("placeCard", () => {
  it("centres when there's no target", () => {
    expect(placeCard(null, card, viewport, "right")).toEqual({ x: 550, y: 350 });
  });

  it("puts the card to the right of a left sidebar", () => {
    const palette = { x: 0, y: 48, width: 256, height: 852 };
    expect(placeCard(palette, card, viewport, "right")).toEqual({ x: 272, y: 374 });
  });

  it("falls back to the left when the right side is off-screen", () => {
    const inspector = { x: 1152, y: 48, width: 288, height: 852 };
    expect(placeCard(inspector, card, viewport, "right")).toEqual({ x: 796, y: 374 });
  });

  it("slides along the edge to stay on screen", () => {
    const button = { x: 1380, y: 8, width: 32, height: 32 };
    expect(placeCard(button, card, viewport, "bottom")).toEqual({ x: 1084, y: 56 });
  });

  it("places inside the bottom of a large target", () => {
    const canvas = { x: 256, y: 48, width: 896, height: 852 };
    expect(placeCard(canvas, card, viewport, "inside-bottom")).toEqual({ x: 534, y: 676 });
  });
});
