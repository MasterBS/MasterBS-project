import type { MapProvider } from "@/types/map-provider";

// map-provider-selection feature 시절의 localStorage 기반 기본값/저장 키는
// sso-login에서 계정(user_settings.map_provider)이 단일 소스가 되며 제거됐다.

export const MAP_PROVIDER_LABELS: Record<MapProvider, string> = {
  kakao: "카카오맵",
  naver: "네이버지도",
  tmap: "티맵",
};
