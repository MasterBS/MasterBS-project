import type { BrandKey, FuelType } from "@/types/station";

export const OPINET_AROUND_ALL_URL = "https://www.opinet.co.kr/api/aroundAll.do";

// 실호출로 확정된 prodcd (2026-07-23, 서울 중구권 반경 3km/10km 대조)
export const FUEL_PRODCD_MAP: Record<FuelType, string> = {
  gasoline: "B027",
  diesel: "D047",
  lpg: "K015",
};

export const KNOWN_BRAND_CODES = ["SKE", "GSC", "HDO", "SOL"] as const;

export const BRAND_LABEL_MAP: Record<BrandKey, string> = {
  SKE: "SK에너지",
  GSC: "GS칼텍스",
  HDO: "HD현대오일뱅크",
  SOL: "S-OIL",
  ETC: "자가상표/기타",
};

export const BRAND_KEYS: BrandKey[] = [...KNOWN_BRAND_CODES, "ETC"];

export const RADIUS_STEPS_M = [3000, 5000, 10000] as const;

export const MIN_RESULT_COUNT = 5;
