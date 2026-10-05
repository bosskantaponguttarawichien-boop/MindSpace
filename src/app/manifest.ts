import type { MetadataRoute } from "next";
import { SYSTEM_BAR_COLOR } from "@/shared/lib/app-viewport";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MindSpace",
    short_name: "MindSpace",
    description: "An infinite board for connecting ideas and building knowledge.",
    start_url: "/",
    display: "standalone",
    background_color: "#4939ed",
    // Matches the top bar so an installed app's status bar blends into it.
    theme_color: SYSTEM_BAR_COLOR,
    icons: [
      { src: "/icons/mindspace-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/mindspace-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
