export type LatLng = { lat: number; lng: number };

const KAKAO_ROUTE_URL = "https://m.map.kakao.com/scheme/route";

export function buildKakaoRouteUrl(origin: LatLng, dest: LatLng): string {
  const params = new URLSearchParams({
    sp: `${origin.lat},${origin.lng}`,
    ep: `${dest.lat},${dest.lng}`,
    by: "car",
  });

  return `${KAKAO_ROUTE_URL}?${params.toString()}`;
}
