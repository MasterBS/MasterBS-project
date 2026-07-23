"use client";

import { useState } from "react";
import { Loader2Icon } from "lucide-react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { useStations } from "@/hooks/use-stations";
import { FuelToggle } from "@/components/gas/fuel-toggle";
import { StationList } from "@/components/gas/station-list";
import type { FuelType } from "@/types/station";

export default function Page() {
  const [fuel, setFuel] = useState<FuelType>("gasoline");
  const geolocation = useGeolocation();
  const stations = useStations({
    lat: geolocation.coords?.lat ?? null,
    lng: geolocation.coords?.lng ?? null,
    fuel,
  });

  const isLoading =
    geolocation.status === "idle" ||
    geolocation.status === "loading" ||
    (geolocation.status === "success" && stations.status !== "success" && stations.status !== "error");

  return (
    <main className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-lg font-bold">내 주변 저가 주유소 TOP5</h1>
      <FuelToggle value={fuel} onChange={setFuel} />
      <div className="mt-4">
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2Icon className="size-8 animate-spin" />
            <span className="text-sm">근처 주유소를 찾는 중...</span>
          </div>
        )}
        {stations.status === "success" && <StationList stations={stations.stations} />}
      </div>
    </main>
  );
}
