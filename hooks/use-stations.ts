"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandKey, FuelType, Station } from "@/types/station";

export type UseStationsParams = {
  lat: number | null;
  lng: number | null;
  fuel: FuelType;
  brands?: BrandKey[];
  selfOnly?: boolean;
};

export type UseStationsStatus = "idle" | "loading" | "success" | "error";

export function useStations({ lat, lng, fuel, brands, selfOnly }: UseStationsParams) {
  const [status, setStatus] = useState<UseStationsStatus>("idle");
  const [stations, setStations] = useState<Station[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const brandsKey = brands && brands.length > 0 ? brands.join(",") : "";

  useEffect(() => {
    if (lat === null || lng === null) {
      setStatus("idle");
      return;
    }

    const controller = new AbortController();
    setStatus("loading");

    const params = new URLSearchParams({ lat: String(lat), lng: String(lng), fuel });
    if (brandsKey) params.set("brands", brandsKey);
    if (selfOnly) params.set("selfOnly", "true");

    fetch(`/api/stations?${params.toString()}`, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "가격 정보를 불러오지 못했어요.");
        }
        return (await res.json()) as Station[];
      })
      .then((data) => {
        setStations(data);
        setStatus("success");
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(err instanceof Error ? err.message : "가격 정보를 불러오지 못했어요.");
        setStatus("error");
      });

    return () => controller.abort();
  }, [lat, lng, fuel, brandsKey, selfOnly, retryCount]);

  const retry = useCallback(() => setRetryCount((count) => count + 1), []);

  return { status, stations, error, retry };
}
