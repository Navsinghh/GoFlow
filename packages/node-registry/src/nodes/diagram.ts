import { z } from "zod";
import { defineNode, field, type ShapeKind } from "../define";

const shapeSchema = (fill: string, label: string, textColor: string) =>
  z.object({
    label: field(z.string().default(label), { label: "Label", widget: "textarea", inline: true }),
    fill: field(z.string().default(fill), { label: "Fill", widget: "color" }),
    stroke: field(z.string().default("#5b6b8c"), { label: "Border", widget: "color" }),
    textColor: field(z.string().default(textColor), { label: "Text", widget: "color" }),
  });

const sizes: Record<ShapeKind, { width: number; height: number }> = {
  rectangle: { width: 160, height: 80 },
  rounded: { width: 160, height: 64 },
  diamond: { width: 140, height: 140 },
  ellipse: { width: 140, height: 90 },
  sticky: { width: 180, height: 160 },
  label: { width: 160, height: 40 },
};

const shape = (shape: ShapeKind, label: string, icon: string, fill: string, placeholder = "", textColor = "#e6edf7") =>
  defineNode({
    type: shape,
    mode: "diagram",
    category: shape === "sticky" || shape === "label" ? "Annotate" : "Shapes",
    label,
    description: `${label} shape`,
    icon,
    shape,
    defaultSize: sizes[shape],
    configSchema: shapeSchema(fill, placeholder, textColor),
  });

export const diagramNodes = [
  shape("rectangle", "Process", "Square", "#1c2a44"),
  shape("rounded", "Start / end", "RectangleHorizontal", "#173a36"),
  shape("diamond", "Decision", "Diamond", "#3a2a17", "Yes?"),
  shape("ellipse", "Event", "Circle", "#2c1f3f"),
  shape("sticky", "Sticky note", "StickyNote", "#e8c547", "Note", "#2b2205"),
  shape("label", "Text label", "Text", "transparent", "Text"),
];
