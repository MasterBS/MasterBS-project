"use client";

import { useCallback, useEffect, useState } from "react";
import { HeartIcon, Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AccountErrorMessage } from "@/components/gas/status-message";
import type { Favorite } from "@/types/favorite";

type FavoritesListState =
  | { status: "loading" | "error"; favorites: Favorite[] }
  | { status: "loaded"; favorites: Favorite[] };

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function FavoritesList() {
  const [state, setState] = useState<FavoritesListState>({ status: "loading", favorites: [] });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => (s.status === "error" ? { status: "loading", favorites: [] } : s));

    fetch("/api/favorites")
      .then((res) => {
        if (!res.ok) throw new Error(`favorites 조회 실패: ${res.status}`);
        return res.json() as Promise<Favorite[]>;
      })
      .then((favorites) => {
        if (cancelled) return;
        setState({ status: "loaded", favorites });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error", favorites: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  const retry = useCallback(() => setRetryCount((c) => c + 1), []);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2Icon className="size-8 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (state.status === "error") {
    return <AccountErrorMessage onRetry={retry} />;
  }

  if (state.favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <HeartIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">즐겨찾은 주유소가 없어요</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {state.favorites.map((favorite) => (
        <li key={favorite.id}>
          <Card size="sm">
            <CardContent>
              <p className="truncate text-sm font-bold">{favorite.name}</p>
              <p className="text-xs text-muted-foreground">
                {favorite.brandLabel} · {formatPrice(favorite.price)}
              </p>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
