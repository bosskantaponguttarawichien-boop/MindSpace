import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MindSpace",
    short_name: "MindSpace",
    description: "An infinite board for connecting ideas and building knowledge.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#7357e8",
    icons: [
      { src: "/icons/mindspace-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/mindspace-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
