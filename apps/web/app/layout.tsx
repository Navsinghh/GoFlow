import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face" });

const description =
  "Diagrams and AI workflows on one live, collaborative canvas. Sketch a process, design the pipeline, and work on it together in real time.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.BETTER_AUTH_URL ?? "http://localhost:3000"),
  title: "Flowcraft v1: diagrams and AI workflows, together",
  description,
  openGraph: { type: "website", siteName: "Flowcraft", title: "Flowcraft v1", description },
  twitter: { card: "summary_large_image", title: "Flowcraft v1", description },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
