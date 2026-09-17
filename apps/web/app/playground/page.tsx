import type { Metadata } from "next";
import { Playground } from "./Playground";

export const metadata: Metadata = { title: "Playground · Flowcraft" };

export default function PlaygroundPage() {
  return <Playground />;
}
