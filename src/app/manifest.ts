import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShotClock Advanced Basketball Analytics",
    short_name: "ShotClock",
    description: "Advanced NBA player and team analysis.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#101820",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
