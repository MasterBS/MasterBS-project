import type { MapProvider } from "@/types/map-provider";

export type LatLng = { lat: number; lng: number };

const KAKAO_ROUTE_URL = "https://m.map.kakao.com/scheme/route";
const NAVER_ROUTE_URL = "nmap://route/car";
const NAVER_ROUTE_APPNAME = "cheap-gas-finder";
const NAVER_WEB_DIRECTIONS_URL = "https://map.naver.com/p/directions";
const NAVER_APP_FALLBACK_DELAY_MS = 1200;

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

export function buildNaverWebFallbackUrl(origin: LatLng, dest: LatLng, destName?: string): string {
  const originSegment = `${origin.lng},${origin.lat},${encodeURIComponent("현재 위치")},`;
  const destSegment = `${dest.lng},${dest.lat},${encodeURIComponent(destName ?? "목적지")},`;

  return `${NAVER_WEB_DIRECTIONS_URL}/${originSegment}/${destSegment}/-/car`;
}

/**
 * 네이버지도는 앱 딥링크(nmap://)만 공식 지원하고 앱 미설치 환경(대부분의 데스크톱)을 위한
 * 웹 폴백 URL이 없다. 딥링크를 먼저 열고, 일정 시간 안에 앱이 반응(popup을 다른 곳으로
 * 이동)하지 않으면 같은 탭을 네이버지도 웹으로 리다이렉트한다.
 */
export function openRoute(
  provider: MapProvider,
  origin: LatLng,
  dest: LatLng,
  destName?: string,
): void {
  if (provider === "kakao") {
    window.open(buildKakaoRouteUrl(origin, dest), "_blank");
    return;
  }

  const popup = window.open(buildNaverRouteUrl(origin, dest, destName), "_blank");
  if (!popup) return;

  setTimeout(() => {
    if (!popup.closed) {
      popup.location.href = buildNaverWebFallbackUrl(origin, dest, destName);
    }
  }, NAVER_APP_FALLBACK_DELAY_MS);
}
