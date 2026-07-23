export type FuelType = "gasoline" | "diesel" | "lpg";

export type BrandKey = "SKE" | "GSC" | "HDO" | "SOL" | "ETC";

export type Station = {
  id: string;
  name: string;
  brandCode: BrandKey;
  brandLabel: string;
  price: number;
  distance: number;
  lat: number;
  lng: number;
  isSelfEstimated: boolean;
};
