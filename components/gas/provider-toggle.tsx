"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MAP_PROVIDER_LABEL } from "@/config/map-provider";
import type { MapProvider } from "@/types/map-provider";

const PROVIDER_OPTIONS: { value: MapProvider; label: string }[] = [
  { value: "kakao", label: MAP_PROVIDER_LABEL.kakao },
  { value: "naver", label: MAP_PROVIDER_LABEL.naver },
];

export function ProviderToggle({
  value,
  onChange,
}: {
  value: MapProvider;
  onChange: (provider: MapProvider) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as MapProvider);
      }}
      className="w-full"
    >
      {PROVIDER_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="flex-1">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
