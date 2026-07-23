import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "주유소알리미 - 내 주변 저가 주유소",
    short_name: "주유소알리미",
    description: "현재 위치 기준 가장 저렴한 주유소 TOP5를 찾아드립니다",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#262626",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
