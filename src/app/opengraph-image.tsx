import { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 72,
          background: "#101820",
          color: "#ffffff",
        }}
      >
        <div style={{ color: "#5eead4", fontSize: 28, fontWeight: 800, letterSpacing: 5 }}>
          ADVANCED BASKETBALL BREAKDOWNS
        </div>
        <div style={{ marginTop: 26, fontSize: 82, fontWeight: 900, letterSpacing: 2 }}>
          Basketball Savant
        </div>
        <div style={{ marginTop: 24, maxWidth: 980, color: "#cbd5e1", fontSize: 34, lineHeight: 1.35 }}>
          NBA player, team, comparison, and similarity analysis powered by the 2025-26 masterfile.
        </div>
      </div>
    ),
    size,
  );
}
