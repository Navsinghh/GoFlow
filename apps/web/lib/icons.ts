import {
  Box,
  Circle,
  Diamond,
  LogIn,
  LogOut,
  RectangleHorizontal,
  Sparkles,
  Square,
  StickyNote,
  Text,
  Type,
  type LucideIcon,
} from "lucide-react";

// Explicit map (rather than lucide's `icons` object) keeps unused icons out of the bundle.
const icons: Record<string, LucideIcon> = {
  Circle,
  Diamond,
  LogIn,
  LogOut,
  RectangleHorizontal,
  Sparkles,
  Square,
  StickyNote,
  Text,
  Type,
};

export function nodeIcon(name: string): LucideIcon {
  return icons[name] ?? Box;
}
