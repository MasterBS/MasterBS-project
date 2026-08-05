"use client";

import { useCallback, useEffect, useState } from "react";
import { MAP_PROVIDER_STORAGE_KEY } from "@/config/map-provider";
import type { MapProvider } from "@/types/map-provider";

export type MapProviderState =
  | { status: "unselected" }
  | { status: "selected"; provider: MapProvider };

function isMapProvider(value: string): value is MapProvider {
  return value === "kakao" || value === "naver";
}

function readStoredProvider(): MapProvider | null {
  try {
    const stored = localStorage.getItem(MAP_PROVIDER_STORAGE_KEY);
    return stored && isMapProvider(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function useMapProvider() {
  const [state, setState] = useState<MapProviderState>({ status: "unselected" });

  useEffect(() => {
    const stored = readStoredProvider();
    if (stored) setState({ status: "selected", provider: stored });
  }, []);

  const select = useCallback((provider: MapProvider) => {
    setState({ status: "selected", provider });
    try {
      localStorage.setItem(MAP_PROVIDER_STORAGE_KEY, provider);
    } catch {
      // 시크릿 모드·용량 초과 등으로 저장 실패해도 이번 세션의 상태는 이미 갱신됨
    }
  }, []);

  return { ...state, select };
}
