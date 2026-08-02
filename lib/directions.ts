import type { MapProvider } from "@/types/map-provider";

export type LatLng = { lat: number; lng: number };

const KAKAO_ROUTE_URL = "https://m.map.kakao.com/scheme/route";
const NAVER_ROUTE_URL = "nmap://route/car";
const NAVER_ROUTE_APPNAME = "cheap-gas-finder";

export function buildKakaoRouteUrl(origin: LatLng, dest: LatLng): string {
  const params = new URLSearchParams({
    sp: `${origin.lat},${origin.lng}`,
    ep: `${dest.lat},${dest.lng}`,
    by: "car",
  });

  return `${KAKAO_ROUTE_URL}?${params.toString()}`;
}

export function buildNaverRouteUrl(origin: LatLng, dest: LatLng, destName?: string): string {
  const params = new URLSearchParams({
    slat: `${origin.lat}`,
    slng: `${origin.lng}`,
    sname: "현재 위치",
    dlat: `${dest.lat}`,
    dlng: `${dest.lng}`,
    dname: destName ?? "목적지",
    appname: NAVER_ROUTE_APPNAME,
  });

  return `${NAVER_ROUTE_URL}?${params.toString()}`;
}

export function buildRouteUrl(
  provider: MapProvider,
  origin: LatLng,
  dest: LatLng,
  destName?: string,
): string {
  return provider === "naver"
    ? buildNaverRouteUrl(origin, dest, destName)
    : buildKakaoRouteUrl(origin, dest);
}
