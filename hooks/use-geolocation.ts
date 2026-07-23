"use client";

import { useCallback, useEffect, useState } from "react";

export type GeolocationCoords = { lat: number; lng: number };

export type GeolocationState =
  | { status: "idle"; coords: null }
  | { status: "loading"; coords: null }
  | { status: "success"; coords: GeolocationCoords }
  | { status: "denied"; coords: null }
  | { status: "error"; coords: null };

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({ status: "idle", coords: null });

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState({ status: "error", coords: null });
      return;
    }

    setState({ status: "loading", coords: null });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState({
          status: "success",
          coords: { lat: position.coords.latitude, lng: position.coords.longitude },
        });
      },
      (error) => {
        setState({
          status: error.code === error.PERMISSION_DENIED ? "denied" : "error",
          coords: null,
        });
      },
    );
  }, []);

  useEffect(() => {
    request();
  }, [request]);

  return { ...state, retry: request };
}
