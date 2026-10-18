import { ImageResponse } from "next/og";

export const alt = "Flowcraft v1: diagrams and AI workflows on one live, collaborative canvas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Link-preview card shown when the site is shared on social media or chat apps. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#011627",
          color: "#e6edf7",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: 36, color: "#00a3ff" }}>
          <span>flowcraft</span>
          <span
            style={{
              fontSize: 24,
              border: "2px solid #00a3ff",
              borderRadius: "999px",
              padding: "2px 14px",
            }}
          >
            v1
          </span>
        </div>
        <div style={{ marginTop: "36px", fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>Map it out.</div>
        <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.1 }}>Then make it run.</div>
        <div style={{ marginTop: "32px", fontSize: 30, color: "#8aa1bd" }}>
          Diagrams and AI workflows on one live, collaborative canvas.
        </div>
      </div>
    ),
    size,
  );
}
