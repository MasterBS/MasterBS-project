import type { MapProvider } from "@/types/map-provider";
import type { BrandKey, FuelType } from "@/types/station";

export type UserSettings = {
  userKey: string;
  fuelType: FuelType;
  brands: BrandKey[];
  // null이면 이 계정에 아직 지도 provider를 정한 적 없음 (S11/S13 분기 기준)
  mapProvider: MapProvider | null;
  updatedAt: string;
};

export type UserSettingsPartial = Partial<Pick<UserSettings, "fuelType" | "brands" | "mapProvider">>;
