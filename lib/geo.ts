import proj4 from "proj4";

const KATEC_DEF =
  "+proj=tmerc +lat_0=38 +lon_0=128 +ellps=bessel +units=m +x_0=400000 +y_0=600000 +k=0.9999 +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43 +no_defs";
const WGS84_DEF = "+proj=longlat +datum=WGS84 +no_defs";

export function wgs84ToKatec(lng: number, lat: number): { x: number; y: number } {
  const [x, y] = proj4(WGS84_DEF, KATEC_DEF, [lng, lat]);
  return { x, y };
}

export function katecToWgs84(x: number, y: number): { lng: number; lat: number } {
  const [lng, lat] = proj4(KATEC_DEF, WGS84_DEF, [x, y]);
  return { lng, lat };
}
