import { findCheapestStations } from "@/services/stations";
import type { BrandKey, FuelType } from "@/types/station";

const FUEL_TYPES: FuelType[] = ["gasoline", "diesel", "lpg"];
const BRAND_KEYS: BrandKey[] = ["SKE", "GSC", "HDO", "SOL", "ETC"];

function isFuelType(value: string): value is FuelType {
  return (FUEL_TYPES as string[]).includes(value);
}

function parseBrands(value: string | null): BrandKey[] | undefined {
  if (!value) return undefined;
  const parsed = value.split(",").filter((v): v is BrandKey => (BRAND_KEYS as string[]).includes(v));
  return parsed.length > 0 ? parsed : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const fuelParam = searchParams.get("fuel") ?? "gasoline";

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "lat, lng는 필수 숫자 파라미터입니다." }, { status: 400 });
  }

  if (!isFuelType(fuelParam)) {
    return Response.json({ error: `fuel은 ${FUEL_TYPES.join("/")} 중 하나여야 합니다.` }, { status: 400 });
  }

  const brands = parseBrands(searchParams.get("brands"));
  const selfOnly = searchParams.get("selfOnly") === "true";

  try {
    const stations = await findCheapestStations({ lat, lng, fuel: fuelParam, brands, selfOnly });
    return Response.json(stations);
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "가격 정보를 불러오지 못했어요." },
      { status: 502 },
    );
  }
}
