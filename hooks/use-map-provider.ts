"use client";

import { useCallback, useEffect, useState } from "react";
import type { MapProvider } from "@/types/map-provider";
import type { UserSettings } from "@/types/user-settings";

export type UseMapProviderState =
  | { status: "loading"; provider: null }
  | { status: "loaded"; provider: MapProvider | null };

// 계정의 user_settings.map_provider가 유일한 소스다(localStorage는 더 이상 쓰지 않음).
// provider === null이면 이 계정에 아직 지도 provider를 정한 적 없음(S11/S13 분기 기준).
export function useMapProvider() {
  const [state, setState] = useState<UseMapProviderState>({ status: "loading", provider: null });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/user-settings")
      .then((res) => res.json() as Promise<UserSettings | null>)
      .then((settings) => {
        if (cancelled) return;
        setState({ status: "loaded", provider: settings?.mapProvider ?? null });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setProvider = useCallback((next: MapProvider) => {
    // 낙관적으로 먼저 반영한다(S12-2: 선택 즉시 검색 화면으로 진입) - 저장은 병행한다.
    setState({ status: "loaded", provider: next });
    return fetch("/api/user-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapProvider: next }),
    }).then(() => undefined);
  }, []);

  return { ...state, setProvider };
}
