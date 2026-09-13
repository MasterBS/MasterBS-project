"use client";

import { useState } from "react";
import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useFavorites } from "@/hooks/use-favorites";
import type { Station } from "@/types/station";

export function FavoriteButton({ station }: { station: Station }) {
  const { isFavorited, toggleFavorite } = useFavorites();
  const favorited = isFavorited(station.id);
  // 요청이 진행 중일 때 버튼을 막는다 - 연속 클릭(더블탭)이 toggleFavorite의
  // select-then-insert/delete를 레이스시켜 서버의 unique 제약을 건드리는 것을 막는다
  // (동시에 열린 다른 탭/기기에서의 진짜 레이스는 여전히 남지만, 가장 흔한 경우는 방지된다).
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);

    await toggleFavorite({
      stationUniId: station.id,
      name: station.name,
      brandLabel: station.brandLabel,
      lat: station.lat,
      lng: station.lng,
      price: station.price,
    });

    setPending(false);
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="즐겨찾기"
      aria-pressed={favorited}
      disabled={pending}
      onClick={handleClick}
    >
      <HeartIcon className={cn(favorited && "fill-current text-primary")} aria-hidden="true" />
    </Button>
  );
}
