import { NavigationIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { buildKakaoRouteUrl, type LatLng } from "@/lib/directions";
import { cn } from "@/lib/utils";
import type { Station } from "@/types/station";

function formatPrice(price: number): string {
  return `${price.toLocaleString("ko-KR")}원`;
}

function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)}m`;
  }
  return `${(distanceMeters / 1000).toFixed(1)}km`;
}

export function StationList({
  stations,
  selectedId,
  onSelect,
  currentLocation,
}: {
  stations: Station[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  currentLocation: LatLng;
}) {
  return (
    <ul className="flex flex-col gap-2">
      {stations.map((station, index) => {
        const isSelected = station.id === selectedId;
        return (
          <li key={station.id}>
            <Card
              size="sm"
              className={cn("flex-row items-center gap-3", isSelected && "ring-2 ring-primary")}
            >
              <CardContent className="flex flex-1 items-center gap-3">
                <button
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelect?.(station.id)}
                  className="flex flex-1 items-center gap-3 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{station.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {station.brandLabel} · {formatDistance(station.distance)}
                    </p>
                  </div>
                </button>
                <div className="shrink-0 text-right">
                  <div className="text-sm font-bold">{formatPrice(station.price)}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1"
                    onClick={() => window.open(buildKakaoRouteUrl(currentLocation, station), "_blank")}
                  >
                    <NavigationIcon data-icon="inline-start" aria-hidden="true" />
                    길찾기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </li>
        );
      })}
    </ul>
  );
}
