"use client";

import { useEffect, useRef, useState } from "react";
import { loadNaverMaps } from "@/lib/naver-loader";
import type { Naver, NaverLatLng, NaverMap, NaverMarker } from "@/types/naver";
import type { Station } from "@/types/station";

export type NaverMapViewProps = {
  clientId: string;
  currentLocation: { lat: number; lng: number };
  stations: Station[];
  selectedId?: string | null;
  onError?: () => void;
};

const DEFAULT_ZOOM = 15;

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

export function NaverMapView({
  clientId,
  currentLocation,
  stations,
  selectedId,
  onError,
}: NaverMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const naverRef = useRef<Naver | null>(null);
  const mapRef = useRef<NaverMap | null>(null);
  const markersRef = useRef<NaverMarker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadNaverMaps(clientId)
      .then((naver) => {
        if (cancelled || !containerRef.current) return;
        naverRef.current = naver;
        mapRef.current = new naver.maps.Map(containerRef.current, {
          center: new naver.maps.LatLng(currentLocation.lat, currentLocation.lng),
          zoom: DEFAULT_ZOOM,
        });
        setIsMapReady(true);
      })
      .catch(() => {
        if (!cancelled) onError?.();
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  useEffect(() => {
    const naver = naverRef.current;
    const map = mapRef.current;
    if (!isMapReady || !naver || !map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const positions: NaverLatLng[] = [];

    const currentPosition = new naver.maps.LatLng(currentLocation.lat, currentLocation.lng);
    positions.push(currentPosition);
    markersRef.current.push(
      new naver.maps.Marker({
        position: currentPosition,
        map,
        icon: { url: CURRENT_LOCATION_MARKER_SVG, size: new naver.maps.Size(20, 20) },
      }),
    );

    for (const station of stations) {
      const position = new naver.maps.LatLng(station.lat, station.lng);
      positions.push(position);
      const isSelected = station.id === selectedId;
      markersRef.current.push(
        new naver.maps.Marker({
          position,
          map,
          ...(isSelected
            ? {
                icon: {
                  url: SELECTED_STATION_MARKER_SVG,
                  size: new naver.maps.Size(36, 40),
                },
              }
            : {}),
        }),
      );
    }

    const bounds = new naver.maps.LatLngBounds(positions[0], positions[0]);
    for (const position of positions) {
      bounds.extend(position);
    }
    map.fitBounds(bounds);
  }, [isMapReady, stations, currentLocation, selectedId]);

  return <div ref={containerRef} role="img" aria-label="주변 주유소 위치 지도" className="size-full" />;
}
