import type { MapProvider } from "@/types/map-provider";

export const MAP_PROVIDER_STORAGE_KEY = "map-provider:v1";

export const MAP_PROVIDER_LABEL: Record<MapProvider, string> = {
  kakao: "카카오맵",
  naver: "네이버지도",
};
