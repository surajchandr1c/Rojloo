import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rojlo",
    short_name: "Rojlo",
    description: "Rojlo – Find services, places and post ads in your city.",
    start_url: "/",
    display: "standalone",
    background_color: "",
    theme_color: "",
    icons: [
      {
        src: "/favicon.png",
        sizes: "any",
        type: "image/png",
      },
    ],
  };
}
