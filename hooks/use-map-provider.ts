"use client";

import { useCallback, useEffect, useState } from "react";
import type { MapProvider } from "@/types/map-provider";
import type { UserSettings } from "@/types/user-settings";

export type UseMapProviderState =
  | { status: "loading"; provider: null }
  | { status: "loaded"; provider: MapProvider | null }
  | { status: "error"; provider: null };

// 계정의 user_settings.map_provider가 유일한 소스다(localStorage는 더 이상 쓰지 않음).
// provider === null이면 이 계정에 아직 지도 provider를 정한 적 없음(S11/S13 분기 기준).
export function useMapProvider() {
  const [state, setState] = useState<UseMapProviderState>({ status: "loading", provider: null });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => (s.status === "error" ? { status: "loading", provider: null } : s));

    fetch("/api/user-settings")
      .then((res) => {
        if (!res.ok) throw new Error(`계정 설정 조회 실패: ${res.status}`);
        return res.json() as Promise<UserSettings | null>;
      })
      .then((settings) => {
        if (cancelled) return;
        setState({ status: "loaded", provider: settings?.mapProvider ?? null });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error", provider: null });
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const retry = useCallback(() => setRetryCount((c) => c + 1), []);

  const setProvider = useCallback(
    (next: MapProvider) => {
      // previous를 setState 업데이터 함수 안에서 부수효과로 캡처하지 않는다 - React는 그
      // 업데이터를 항상 다음 렌더 커밋 시점에 호출하므로(호출 시점 동기 실행이 보장되지
      // 않음), 마운트 성공 mock처럼 이미 resolve된 Promise를 쓰는 테스트에서는 .then/.catch가
      // 그 업데이터보다 먼저 실행돼 previous가 항상 초기값(null)으로 잘못 읽혔다. 대신
      // 클로저의 최신 `state`(= 이 콜백의 deps)를 직접 읽는다.
      const previous = state.provider;
      setState({ status: "loaded", provider: next });

      return fetch("/api/user-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mapProvider: next }),
      })
        .then((res) => {
          if (!res.ok) throw new Error(`user_settings 저장 실패: ${res.status}`);
        })
        .catch(() => {
          // 저장 실패 시 되돌린다 - 계정에 반영 안 된 값을 UI가 계속 보여주지 않도록
          setState({ status: "loaded", provider: previous });
        });
    },
    [state.provider],
  );

  return { ...state, retry, setProvider };
}
