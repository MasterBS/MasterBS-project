"use client";

import { useEffect } from "react";
import { HeartIcon, Loader2Icon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AccountErrorMessage } from "@/components/gas/status-message";
import { useFavorites } from "@/hooks/use-favorites";

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

export function FavoritesList() {
  const { status, favorites, ensureLoaded, retry } = useFavorites();

  // 상태가 이미 "loaded"라면(예: 방금 즐겨찾기를 등록/해제한 직후) 다시 GET하지
  // 않는다 - toggleFavorite이 이미 스토어를 최신 상태로 갱신해 두었기 때문에,
  // 여기서 별도로 fetch하면 오히려 아직 커밋되지 않은 이전 상태로 화면이
  // 되돌아갈 수 있다(레이스).
  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  if (status === "idle" || status === "loading") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24">
        <Loader2Icon className="size-8 animate-spin" aria-hidden="true" />
      </div>
    );
  }

  if (status === "error") {
    return <AccountErrorMessage onRetry={retry} />;
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
        <HeartIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="text-sm text-muted-foreground">즐겨찾은 주유소가 없어요</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {favorites.map((favorite) => (
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
