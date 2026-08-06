"use client";

import { useEffect, useRef, useState } from "react";
import { loadTmapMaps } from "@/lib/tmap-loader";
import type { Tmapv2, TmapLatLng, TmapMap, TmapMarker } from "@/types/tmap";
import type { Station } from "@/types/station";

export type TmapMapViewProps = {
  appKey: string;
  currentLocation: { lat: number; lng: number };
  stations: Station[];
  selectedId?: string | null;
  onError?: () => void;
};

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

export function TmapMapView({
  appKey,
  currentLocation,
  stations,
  selectedId,
  onError,
}: TmapMapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const tmapRef = useRef<Tmapv2 | null>(null);
  const mapRef = useRef<TmapMap | null>(null);
  const markersRef = useRef<TmapMarker[]>([]);
  const [isMapReady, setIsMapReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadTmapMaps(appKey)
      .then((tmap) => {
        if (cancelled || !containerRef.current) return;
        tmapRef.current = tmap;
        mapRef.current = new tmap.Map(containerRef.current, {
          center: new tmap.LatLng(currentLocation.lat, currentLocation.lng),
          width: "100%",
          height: "100%",
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
  }, [appKey]);

  useEffect(() => {
    const tmap = tmapRef.current;
    const map = mapRef.current;
    if (!isMapReady || !tmap || !map) return;

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    const positions: TmapLatLng[] = [];

    const currentPosition = new tmap.LatLng(currentLocation.lat, currentLocation.lng);
    positions.push(currentPosition);
    markersRef.current.push(
      new tmap.Marker({
        position: currentPosition,
        map,
        icon: CURRENT_LOCATION_MARKER_SVG,
        iconSize: new tmap.Size(20, 20),
      }),
    );

    for (const station of stations) {
      const position = new tmap.LatLng(station.lat, station.lng);
      positions.push(position);
      const isSelected = station.id === selectedId;
      markersRef.current.push(
        new tmap.Marker({
          position,
          map,
          ...(isSelected
            ? {
                icon: SELECTED_STATION_MARKER_SVG,
                iconSize: new tmap.Size(36, 40),
              }
            : {}),
        }),
      );
    }

    const bounds = new tmap.LatLngBounds(positions[0]);
    for (const position of positions) {
      bounds.extend(position);
    }
    map.fitBounds(bounds);
  }, [isMapReady, stations, currentLocation, selectedId]);

  return <div ref={containerRef} role="img" aria-label="주변 주유소 위치 지도" className="size-full" />;
}
