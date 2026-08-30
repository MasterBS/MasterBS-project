"use client";

import { useState } from "react";
import { HeartIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Station } from "@/types/station";

async function toggleFavoriteRequest(station: Station): Promise<{ favorited: boolean } | null> {
  const res = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      stationUniId: station.id,
      name: station.name,
      brandLabel: station.brandLabel,
      lat: station.lat,
      lng: station.lng,
      price: station.price,
    }),
  });
  if (!res.ok) return null;
  return (await res.json()) as { favorited: boolean };
}

export function FavoriteButton({ station }: { station: Station }) {
  const [favorited, setFavorited] = useState(false);
  // 요청이 진행 중일 때 버튼을 막는다 - 연속 클릭(더블탭)이 toggleFavorite의
  // select-then-insert/delete를 레이스시켜 서버의 unique 제약을 건드리는 것을 막는다
  // (동시에 열린 다른 탭/기기에서의 진짜 레이스는 여전히 남지만, 가장 흔한 경우는 방지된다).
  const [pending, setPending] = useState(false);

  async function handleClick() {
    if (pending) return;
    setPending(true);

    const optimisticNext = !favorited;
    setFavorited(optimisticNext);

    const result = await toggleFavoriteRequest(station);
    if (result) {
      setFavorited(result.favorited);
    } else {
      // 저장 실패 시 되돌린다 - 서버 상태와 UI가 어긋난 채로 남지 않도록
      setFavorited(!optimisticNext);
    }
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
