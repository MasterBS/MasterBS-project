"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { FuelType } from "@/types/station";

const FUEL_OPTIONS: { value: FuelType; label: string }[] = [
  { value: "gasoline", label: "휘발유" },
  { value: "diesel", label: "경유" },
  { value: "lpg", label: "LPG" },
];

export function FuelToggle({
  value,
  onChange,
}: {
  value: FuelType;
  onChange: (fuel: FuelType) => void;
}) {
  return (
    <ToggleGroup
      type="single"
      variant="outline"
      value={value}
      onValueChange={(next) => {
        if (next) onChange(next as FuelType);
      }}
      className="w-full"
    >
      {FUEL_OPTIONS.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value} className="flex-1">
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
