import { Card, CardContent } from "@/components/ui/card";
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

export function StationList({ stations }: { stations: Station[] }) {
  return (
    <ul className="flex flex-col gap-2">
      {stations.map((station, index) => (
        <li key={station.id}>
          <Card size="sm" className="flex-row items-center gap-3">
            <CardContent className="flex flex-1 items-center gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{station.name}</p>
                <p className="text-xs text-muted-foreground">
                  {station.brandLabel} · {formatDistance(station.distance)}
                </p>
              </div>
              <div className="shrink-0 text-right text-sm font-bold">{formatPrice(station.price)}</div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
