"use client";

import { SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { MAP_PROVIDER_LABELS } from "@/config/map-provider";
import type { MapProvider } from "@/types/map-provider";

const PROVIDER_OPTIONS: MapProvider[] = ["kakao", "naver"];

export function SettingsSheet({
  provider,
  onProviderChange,
}: {
  provider: MapProvider;
  onProviderChange: (provider: MapProvider) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="설정">
          <SettingsIcon aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>설정</SheetTitle>
          <SheetDescription>지도 provider를 선택하세요</SheetDescription>
        </SheetHeader>
        <div className="px-4">
          <ToggleGroup
            type="single"
            variant="outline"
            value={provider}
            onValueChange={(next) => {
              if (next) onProviderChange(next as MapProvider);
            }}
            className="w-full"
          >
            {PROVIDER_OPTIONS.map((option) => (
              <ToggleGroupItem key={option} value={option} className="flex-1">
                {MAP_PROVIDER_LABELS[option]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </SheetContent>
    </Sheet>
  );
}
