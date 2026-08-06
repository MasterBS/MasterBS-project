import type { MapProvider } from "@/types/map-provider";

export const DEFAULT_MAP_PROVIDER: MapProvider = "naver";

export const MAP_PROVIDER_STORAGE_KEY = "map-provider";

export const MAP_PROVIDER_LABELS: Record<MapProvider, string> = {
  kakao: "카카오맵",
  naver: "네이버지도",
  tmap: "티맵",
};
