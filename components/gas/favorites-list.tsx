"use client";

import { useEffect, useState } from "react";
import { HeartIcon, Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Favorite } from "@/types/favorite";

type FavoritesListState = { status: "loading" | "loaded"; favorites: Favorite[] };

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function FavoritesList() {
  const [state, setState] = useState<FavoritesListState>({ status: "loading", favorites: [] });

  useEffect(() => {
    let cancelled = false;

    fetch("/api/favorites")
      .then((res) => res.json() as Promise<Favorite[]>)
      .then((favorites) => {
        if (cancelled) return;
        setState({ status: "loaded", favorites });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2Icon className="size-8 animate-spin" aria-hidden="true" />
      </div>
    );
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
