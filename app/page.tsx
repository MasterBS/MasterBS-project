"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Loader2Icon } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useStations } from "@/hooks/use-stations";
import { BRAND_KEYS } from "@/config/opinet";
import { FuelToggle } from "@/components/gas/fuel-toggle";
import { Filters } from "@/components/gas/filters";
import { StationList } from "@/components/gas/station-list";
import type { BrandKey, FuelType } from "@/types/station";

const MapView = dynamic(() => import("@/components/gas/map-view").then((m) => m.MapView), {
  ssr: false,
});

const KAKAO_MAP_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY ?? "";

export default function Page() {
  const [fuel, setFuel] = useState<FuelType>("gasoline");
  const [brands, setBrands] = useState<BrandKey[]>(BRAND_KEYS);
  const [selfOnly, setSelfOnly] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const geolocation = useGeolocation();
  const stations = useStations({
    lat: geolocation.coords?.lat ?? null,
    lng: geolocation.coords?.lng ?? null,
    fuel,
    brands,
    selfOnly,
  });

  const isLoading =
    geolocation.status === "idle" ||
    geolocation.status === "loading" ||
    (geolocation.status === "success" && stations.status !== "success" && stations.status !== "error");

  return (
    <main className="mx-auto max-w-6xl p-4">
      <h1 className="mb-4 text-lg font-bold">내 주변 저가 주유소 TOP5</h1>
      <FuelToggle value={fuel} onChange={setFuel} />
      <div className="mt-3">
        <Filters
          brands={brands}
          onBrandsChange={setBrands}
          selfOnly={selfOnly}
          onSelfOnlyChange={setSelfOnly}
        />
      </div>
      <div className="mt-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2Icon className="size-8 animate-spin" />
            <span className="text-sm">근처 주유소를 찾는 중...</span>
          </div>
        )}
        {stations.status === "success" && geolocation.status === "success" && (
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="md:order-2 md:w-1/2">
              <div className="h-56 md:sticky md:top-4 md:h-[520px]">
                <MapView
                  appKey={KAKAO_MAP_APP_KEY}
                  currentLocation={geolocation.coords}
                  stations={stations.stations}
                  selectedId={selectedId}
                />
              </div>
            </div>
            <div className="md:order-1 md:w-1/2">
              <StationList
                stations={stations.stations}
                selectedId={selectedId}
                onSelect={setSelectedId}
                currentLocation={geolocation.coords}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
