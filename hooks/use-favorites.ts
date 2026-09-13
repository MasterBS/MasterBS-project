"use client";

import { useSyncExternalStore } from "react";
import type { Favorite, FavoriteSnapshotInput } from "@/types/favorite";

export type FavoritesStatus = "idle" | "loading" | "loaded" | "error";

type FavoritesState = {
  status: FavoritesStatus;
  favorites: Favorite[];
};

// 검색 목록의 하트 버튼과 즐겨찾기 목록 화면이 항상 같은 즐겨찾기 데이터를 보도록 하는
// 모듈 전역 스토어. 컴포넌트별 로컬 state로 각자 들고 있으면
// (1) 즐겨찾기 등록 직후 목록 화면으로 이동해도, 그 사이 GET이 서버의 INSERT 커밋보다
//     먼저 도착해 방금 등록한 항목이 빠진 채로 보일 수 있고(레이스),
// (2) 검색 화면 <-> 즐겨찾기 화면을 오가며 하트 버튼이 리마운트될 때 로컬 state가
//     초기화돼 즐겨찾기 표시가 사라져 버린다.
// toggleFavorite이 이 스토어를 직접, 낙관적으로 갱신하므로 두 화면이 언제나 같은
// 값을 즉시 보게 된다.
let state: FavoritesState = { status: "idle", favorites: [] };
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function setState(next: FavoritesState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): FavoritesState {
  return state;
}

async function load(): Promise<void> {
  if (inFlight) return inFlight;

  setState({ status: "loading", favorites: state.favorites });

  const promise = fetch("/api/favorites")
    .then((res) => {
      if (!res.ok) throw new Error(`favorites 조회 실패: ${res.status}`);
      return res.json() as Promise<Favorite[]>;
    })
    .then((favorites) => {
      setState({ status: "loaded", favorites });
    })
    .catch(() => {
      setState({ status: "error", favorites: [] });
    })
    .finally(() => {
      inFlight = null;
    });

  inFlight = promise;
  return promise;
}

// 상태가 "idle"일 때만 불러온다 - 이미 한 번이라도 불러왔거나 toggleFavorite으로
// 갱신된 뒤라면 다시 GET하지 않는다(등록 직후 화면 전환 시 레이스가 생기지 않는 이유).
function ensureLoaded(): void {
  if (state.status === "idle") void load();
}

function replaceInStore(stationUniId: string, favorited: boolean, snapshot: Favorite): void {
  const without = state.favorites.filter((f) => f.stationUniId !== stationUniId);
  setState({
    status: "loaded",
    favorites: favorited ? [snapshot, ...without] : without,
  });
}

async function toggleFavorite(station: FavoriteSnapshotInput): Promise<boolean | null> {
  const wasFavorited = state.favorites.some((f) => f.stationUniId === station.stationUniId);
  const optimisticSnapshot: Favorite = {
    id: `optimistic:${station.stationUniId}`,
    userKey: "",
    createdAt: new Date().toISOString(),
    stationUniId: station.stationUniId,
    name: station.name,
    brandLabel: station.brandLabel,
    lat: station.lat,
    lng: station.lng,
    price: station.price,
  };

  // 낙관적 업데이트: 서버 응답을 기다리지 않고 즉시 반영한다 - 즐겨찾기 목록 화면으로
  // 곧바로 이동해도 등록한 항목이 이미 보인다.
  replaceInStore(station.stationUniId, !wasFavorited, optimisticSnapshot);

  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(station),
  });

  if (!res.ok) {
    // 저장 실패 시 되돌린다 - 서버 상태와 화면이 어긋난 채로 남지 않도록.
    replaceInStore(station.stationUniId, wasFavorited, optimisticSnapshot);
    return null;
  }

  const result = (await res.json()) as { favorited: boolean };
  // 서버가 준 최종 값으로 맞춘다(다른 탭/기기에서 동시에 토글된 경우 등을 대비).
  replaceInStore(station.stationUniId, result.favorited, optimisticSnapshot);
  return result.favorited;
}

export function useFavorites() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return {
    status: snapshot.status,
    favorites: snapshot.favorites,
    isFavorited: (stationUniId: string) =>
      snapshot.favorites.some((f) => f.stationUniId === stationUniId),
    ensureLoaded,
    retry: load,
    toggleFavorite,
  };
}

// 테스트 전용: 모듈 스코프 스토어가 한 테스트 파일의 여러 it() 사이에 남아있지
// 않도록 초기화한다. 프로덕션 코드에서는 호출하지 않는다.
export function __resetFavoritesStoreForTests(): void {
  state = { status: "idle", favorites: [] };
  inFlight = null;
  listeners.clear();
}
