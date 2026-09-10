import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rojlo",
    short_name: "Rojlo",
    description: "Rojlo – Find services, places and post ads in your city.",
    start_url: "/",
    display: "standalone",
    background_color: "#fce7f3",
    theme_color: "#dc2626",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
