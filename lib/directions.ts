export type LatLng = { lat: number; lng: number };

const KAKAO_ROUTE_URL = "https://m.map.kakao.com/scheme/route";
const NAVER_ROUTE_URL = "nmap://route/car";
const NAVER_APP_NAME = "주유소알리미";

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
    slat: String(origin.lat),
    slng: String(origin.lng),
    dlat: String(dest.lat),
    dlng: String(dest.lng),
    appname: NAVER_APP_NAME,
  });
  if (destName) {
    params.set("dname", destName);
  }

  return `${NAVER_ROUTE_URL}?${params.toString()}`;
}
