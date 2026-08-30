"use client";

import { Button } from "@/components/ui/button";
import { MAP_PROVIDER_LABELS } from "@/config/map-provider";
import type { MapProvider } from "@/types/map-provider";

const PROVIDER_OPTIONS: MapProvider[] = ["kakao", "naver", "tmap"];

export function MapProviderPicker({ onSelect }: { onSelect: (provider: MapProvider) => void }) {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center gap-4 p-4">
      <div>
        <p className="text-base font-bold">지도 provider를 선택하세요</p>
        <p className="mt-1 text-xs text-muted-foreground">처음 한 번만 선택하면 계정에 저장돼요</p>
      </div>
      <div className="flex flex-col gap-2">
        {PROVIDER_OPTIONS.map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={() => onSelect(option)}
          >
            {MAP_PROVIDER_LABELS[option]}
          </Button>
        ))}
      </div>
    </main>
  );
}
