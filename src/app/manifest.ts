import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Engineering Nexus",
    short_name: "Eng Nexus",
    description: "Integrated Engineering Research Platform",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#061726",
    theme_color: "#061726",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
