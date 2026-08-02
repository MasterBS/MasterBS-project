import { KakaoMapView } from "./kakao-map-view";
import { NaverMapView } from "./naver-map-view";
import type { MapProvider } from "@/types/map-provider";
import type { Station } from "@/types/station";

export type MapViewProps = {
  provider: MapProvider;
  kakaoAppKey: string;
  naverClientId: string;
  currentLocation: { lat: number; lng: number };
  stations: Station[];
  selectedId?: string | null;
};

export function MapView({
  provider,
  kakaoAppKey,
  naverClientId,
  currentLocation,
  stations,
  selectedId,
}: MapViewProps) {
  if (provider === "naver") {
    return (
      <NaverMapView
        clientId={naverClientId}
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
