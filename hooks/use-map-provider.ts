"use client";

import { useCallback, useEffect, useState } from "react";
import { DEFAULT_MAP_PROVIDER, MAP_PROVIDER_STORAGE_KEY } from "@/config/map-provider";
import type { MapProvider } from "@/types/map-provider";

function isMapProvider(value: string | null): value is MapProvider {
  return value === "kakao" || value === "naver" || value === "tmap";
}

export function useMapProvider() {
  const [provider, setProviderState] = useState<MapProvider>(DEFAULT_MAP_PROVIDER);

  useEffect(() => {
    const stored = window.localStorage.getItem(MAP_PROVIDER_STORAGE_KEY);
    if (isMapProvider(stored)) {
      setProviderState(stored);
    }
  }, []);

  const setProvider = useCallback((next: MapProvider) => {
    setProviderState(next);
    window.localStorage.setItem(MAP_PROVIDER_STORAGE_KEY, next);
  }, []);

  return { provider, setProvider };
}
