"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { KakaoMapView } from "./kakao-map-view";
import { NaverMapView } from "./naver-map-view";
import { TmapMapView } from "./tmap-map-view";
import type { MapProvider } from "@/types/map-provider";
import type { Station } from "@/types/station";

export type MapViewProps = {
  provider: MapProvider;
  kakaoAppKey: string;
  naverClientId: string;
  tmapAppKey: string;
  currentLocation: { lat: number; lng: number };
  stations: Station[];
  selectedId?: string | null;
};

export function MapView({
  provider,
  kakaoAppKey,
  naverClientId,
  tmapAppKey,
  currentLocation,
  stations,
  selectedId,
}: MapViewProps) {
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const isFirstProviderRender = useRef(true);

  useEffect(() => {
    if (isFirstProviderRender.current) {
      isFirstProviderRender.current = false;
      return;
    }
    setHasError(false);
  }, [provider]);

  const handleError = () => setHasError(true);
  const handleRetry = () => {
    setHasError(false);
    setRetryCount((count) => count + 1);
  };

  if (hasError) {
    return (
      <div className="flex size-full flex-col items-center justify-center gap-3 p-4 text-center text-sm text-muted-foreground">
        <p>지도를 불러오지 못했어요. 다시 시도해주세요</p>
        <Button type="button" variant="outline" size="sm" onClick={handleRetry}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (provider === "naver") {
    return (
      <NaverMapView
        key={retryCount}
        clientId={naverClientId}
        currentLocation={currentLocation}
        stations={stations}
        selectedId={selectedId}
        onError={handleError}
      />
    );
  }

  if (provider === "tmap") {
    return (
      <TmapMapView
        key={retryCount}
        appKey={tmapAppKey}
        currentLocation={currentLocation}
        stations={stations}
        selectedId={selectedId}
        onError={handleError}
      />
    );
  }

  return (
    <KakaoMapView
      key={retryCount}
      appKey={kakaoAppKey}
      currentLocation={currentLocation}
      stations={stations}
      selectedId={selectedId}
      onError={handleError}
    />
  );
}
