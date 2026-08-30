"use client";

import { useCallback, useEffect, useState } from "react";
import { BRAND_KEYS } from "@/config/opinet";
import type { BrandKey, FuelType } from "@/types/station";
import type { UserSettings } from "@/types/user-settings";

export type UseAccountFiltersState = {
  status: "loading" | "loaded";
  fuel: FuelType;
  brands: BrandKey[];
};

function putPartial(partial: { fuelType?: FuelType; brands?: BrandKey[] }) {
  return fetch("/api/user-settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
}

// 유종·브랜드 필터를 계정(user_settings)과 동기화한다. 기본값(gasoline, 전체 브랜드)으로
// 즉시 렌더를 시작하고, 계정에 이미 저장된 값이 오면(다른 기기에서 마지막으로 저장한 값,
// S6) 그 값으로 교체한다. 최초 로그인이라 계정에 아직 값이 없으면(S5), 이 기기에서
// 사용자가 필터를 바꿀 때마다 그 값을 그대로 계정에 올린다.
export function useAccountFilters() {
  const [state, setState] = useState<UseAccountFiltersState>({
    status: "loading",
    fuel: "gasoline",
    brands: BRAND_KEYS,
  });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/user-settings")
      .then((res) => {
        if (!res.ok) throw new Error(`계정 설정 조회 실패: ${res.status}`);
        return res.json() as Promise<UserSettings | null>;
      })
      .then((settings) => {
        if (cancelled) return;
        setState({
          status: "loaded",
          fuel: settings?.fuelType ?? "gasoline",
          brands: settings?.brands ?? BRAND_KEYS,
        });
      })
      .catch(() => {
        if (cancelled) return;
        // 이 필터는 검색 화면 렌더를 막지 않는다(기본값으로 이미 동작 중) - 조회가
        // 실패해도 기본값을 유지한 채 "loaded"로 넘어가 무한 로딩/미처리 rejection을 피한다.
        setState((s) => ({ ...s, status: "loaded" }));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setFuel = useCallback((next: FuelType) => {
    setState((s) => ({ ...s, status: "loaded", fuel: next }));
    void putPartial({ fuelType: next });
  }, []);

  const setBrands = useCallback((next: BrandKey[]) => {
    setState((s) => ({ ...s, status: "loaded", brands: next }));
    void putPartial({ brands: next });
  }, []);

  return { ...state, setFuel, setBrands };
}
