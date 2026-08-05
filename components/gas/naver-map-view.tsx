"use client";

import { useEffect, useRef, useState } from "react";
import { loadNaverMaps } from "@/lib/naver-loader";
import type { Naver, NaverMap, NaverMarker } from "@/types/naver";
import type { Station } from "@/types/station";

export type NaverMapViewProps = {
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

export function NaverMapView({ appKey, currentLocation, stations, selectedId }: NaverMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naverRef = useRef<Naver | null>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadNaverMaps(appKey).then((naver) => {
      if (cancelled || !containerRef.current) return;
      naverRef.current = naver;
      mapRef.current = new naver.maps.Map(containerRef.current, {
        center: new naver.maps.LatLng(currentLocation.lat, currentLocation.lng),
        zoom: 15,
      });
      setIsMapReady(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appKey]);

  useEffect(() => {
    const naver = naverRef.current;
    const map = mapRef.current;
    if (!isMapReady || !naver || !map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const bounds = new naver.maps.LatLngBounds();

    const currentPosition = new naver.maps.LatLng(currentLocation.lat, currentLocation.lng);
    markersRef.current.push(
      new naver.maps.Marker({
        position: currentPosition,
        map,
        zIndex: DEFAULT_ZINDEX,
        icon: { url: CURRENT_LOCATION_MARKER_SVG, size: new naver.maps.Size(20, 20) },
      }),
    );
    bounds.extend(currentPosition);

    for (const station of stations) {
      const position = new naver.maps.LatLng(station.lat, station.lng);
      const isSelected = station.id === selectedId;
      markersRef.current.push(
        new naver.maps.Marker({
          position,
          map,
          zIndex: isSelected ? SELECTED_ZINDEX : DEFAULT_ZINDEX,
          ...(isSelected
            ? { icon: { url: SELECTED_STATION_MARKER_SVG, size: new naver.maps.Size(36, 40) } }
            : {}),
        }),
      );
      bounds.extend(position);
    }

    map.fitBounds(bounds);
  }, [isMapReady, stations, currentLocation, selectedId]);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="주변 주유소 위치 지도 (네이버지도)"
      className="size-full"
    />
  );
}
