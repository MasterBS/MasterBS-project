import { katecToWgs84, wgs84ToKatec } from "@/lib/geo";
import {
  BRAND_LABEL_MAP,
  FUEL_PRODCD_MAP,
  KNOWN_BRAND_CODES,
  MIN_RESULT_COUNT,
  OPINET_AROUND_ALL_URL,
  RADIUS_STEPS_M,
} from "@/config/opinet";
import type { BrandKey, FuelType, Station } from "@/types/station";

type OpinetOilRaw = {
  UNI_ID: string;
  POLL_DIV_CD: string;
  OS_NM: string;
  PRICE: number;
  DISTANCE: number;
  GIS_X_COOR: number;
  GIS_Y_COOR: number;
};

type OpinetAroundAllResponse = {
  RESULT: { OIL: OpinetOilRaw[] };
};

export type FindCheapestStationsParams = {
  lat: number;
  lng: number;
  fuel: FuelType;
  brands?: BrandKey[];
  selfOnly?: boolean;
};

function toBrandKey(pollDivCd: string): BrandKey {
  return (KNOWN_BRAND_CODES as readonly string[]).includes(pollDivCd) ? (pollDivCd as BrandKey) : "ETC";
}

function toStation(raw: OpinetOilRaw): Station {
  const brandCode = toBrandKey(raw.POLL_DIV_CD);
  const { lng, lat } = katecToWgs84(raw.GIS_X_COOR, raw.GIS_Y_COOR);

  return {
    id: raw.UNI_ID,
    name: raw.OS_NM,
    brandCode,
    brandLabel: BRAND_LABEL_MAP[brandCode],
    price: raw.PRICE,
    distance: raw.DISTANCE,
    lat,
    lng,
    isSelfEstimated: raw.OS_NM.includes("셀프"),
  };
}

async function fetchAroundAll(x: number, y: number, radius: number, prodcd: string): Promise<OpinetOilRaw[]> {
  const apiKey = process.env.OPINET_API_KEY;
  if (!apiKey) {
    throw new Error("OPINET_API_KEY가 설정되지 않았습니다.");
  }

  const url = new URL(OPINET_AROUND_ALL_URL);
  url.searchParams.set("code", apiKey);
  url.searchParams.set("out", "json");
  url.searchParams.set("x", String(x));
  url.searchParams.set("y", String(y));
  url.searchParams.set("radius", String(radius));
  url.searchParams.set("prodcd", prodcd);
  url.searchParams.set("sort", "1");

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`오피넷 API 호출 실패: ${res.status}`);
  }

  const data = (await res.json()) as OpinetAroundAllResponse;
  return data.RESULT.OIL;
}

function applyFilters(stations: Station[], brands: BrandKey[] | undefined, selfOnly: boolean | undefined): Station[] {
  return stations.filter((station) => {
    if (brands && brands.length > 0 && !brands.includes(station.brandCode)) return false;
    if (selfOnly && !station.isSelfEstimated) return false;
    return true;
  });
}

function sortStations(stations: Station[]): Station[] {
  return [...stations].sort((a, b) => a.price - b.price || a.distance - b.distance);
}

export async function findCheapestStations({
  lat,
  lng,
  fuel,
  brands,
  selfOnly,
}: FindCheapestStationsParams): Promise<Station[]> {
  const prodcd = FUEL_PRODCD_MAP[fuel];
  const { x, y } = wgs84ToKatec(lng, lat);

  let filtered: Station[] = [];

  for (const radius of RADIUS_STEPS_M) {
    const raw = await fetchAroundAll(x, y, radius, prodcd);
    const stations = raw.map(toStation);
    filtered = applyFilters(stations, brands, selfOnly);
    if (filtered.length >= MIN_RESULT_COUNT) break;
  }

  return sortStations(filtered).slice(0, MIN_RESULT_COUNT);
}
