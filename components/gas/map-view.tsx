"use client";

import { useEffect, useRef, useState } from "react";
import { loadKakaoMaps } from "@/lib/kakao-loader";
import type { Kakao, KakaoMap, KakaoMarker } from "@/types/kakao";
import type { Station } from "@/types/station";

export type MapViewProps = {
  appKey: string;
  currentLocation: { lat: number; lng: number };
  stations: Station[];
  selectedId?: string | null;
};

const DEFAULT_ZINDEX = 2;
const SELECTED_ZINDEX = 10;

const CURRENT_LOCATION_MARKER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><circle cx="10" cy="10" r="8" fill="#2563eb" stroke="white" stroke-width="3"/></svg>',
  );

const SELECTED_STATION_MARKER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="36" height="40"><path d="M18 0C8 0 0 8 0 18c0 13 18 22 18 22s18-9 18-22C36 8 28 0 18 0z" fill="#dc2626"/><circle cx="18" cy="18" r="7" fill="white"/></svg>',
  );

export function MapView({ appKey, currentLocation, stations, selectedId }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const kakaoRef = useRef<Kakao | null>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef<KakaoMarker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadKakaoMaps(appKey).then((kakao) => {
      if (cancelled || !containerRef.current) return;
      kakaoRef.current = kakao;
      mapRef.current = new kakao.maps.Map(containerRef.current, {
        center: new kakao.maps.LatLng(currentLocation.lat, currentLocation.lng),
        level: 5,
      });
      setIsMapReady(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appKey]);

  useEffect(() => {
    const kakao = kakaoRef.current;
    const map = mapRef.current;
    if (!isMapReady || !kakao || !map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new kakao.maps.LatLngBounds();

    const currentPosition = new kakao.maps.LatLng(currentLocation.lat, currentLocation.lng);
    markersRef.current.push(
      new kakao.maps.Marker({
        position: currentPosition,
        map,
        zIndex: DEFAULT_ZINDEX,
        image: new kakao.maps.MarkerImage(CURRENT_LOCATION_MARKER_SVG, new kakao.maps.Size(20, 20)),
      }),
    );
    bounds.extend(currentPosition);

    for (const station of stations) {
      const position = new kakao.maps.LatLng(station.lat, station.lng);
      const isSelected = station.id === selectedId;
      markersRef.current.push(
        new kakao.maps.Marker({
          position,
          map,
          zIndex: isSelected ? SELECTED_ZINDEX : DEFAULT_ZINDEX,
          ...(isSelected
            ? { image: new kakao.maps.MarkerImage(SELECTED_STATION_MARKER_SVG, new kakao.maps.Size(36, 40)) }
            : {}),
        }),
      );
      bounds.extend(position);
    }

    map.setBounds(bounds);
  }, [isMapReady, stations, currentLocation, selectedId]);

  return <div ref={containerRef} role="img" aria-label="주변 주유소 위치 지도" className="size-full" />;
}
