"use client";

import { Button } from "@/components/ui/button";
import { MAP_PROVIDER_LABEL } from "@/config/map-provider";
import type { MapProvider } from "@/types/map-provider";

const PROVIDERS: MapProvider[] = ["kakao", "naver"];

export function ProviderSelect({ onSelect }: { onSelect: (provider: MapProvider) => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
      <div>
        <h1 className="text-base font-bold">지도를 어떤 서비스로 볼까요?</h1>
        <p className="mt-1 text-xs text-muted-foreground">선택한 제공자로 지도와 길찾기가 연결됩니다</p>
      </div>
      <div className="flex w-full max-w-xs flex-col gap-3">
        {PROVIDERS.map((provider) => (
          <Button key={provider} type="button" variant="outline" size="lg" onClick={() => onSelect(provider)}>
            {MAP_PROVIDER_LABEL[provider]}
          </Button>
        ))}
      </div>
    </div>
  );
}
