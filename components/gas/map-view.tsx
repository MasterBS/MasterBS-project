import { MapView as KakaoMapView } from "./kakao-map-view";
import { NaverMapView } from "./naver-map-view";
import type { MapProvider } from "@/types/map-provider";
import type { Station } from "@/types/station";

export type MapViewProps = {
  provider: MapProvider;
  kakaoAppKey: string;
  naverAppKey: string;
  currentLocation: { lat: number; lng: number };
  stations: Station[];
  selectedId?: string | null;
};

export function MapView({
  provider,
  kakaoAppKey,
  naverAppKey,
  currentLocation,
  stations,
  selectedId,
}: MapViewProps) {
  if (provider === "naver") {
    return (
      <NaverMapView
        appKey={naverAppKey}
        currentLocation={currentLocation}
        stations={stations}
        selectedId={selectedId}
      />
    );
  }

  return (
    <KakaoMapView
      appKey={kakaoAppKey}
      currentLocation={currentLocation}
      stations={stations}
      selectedId={selectedId}
    />
  );
}
