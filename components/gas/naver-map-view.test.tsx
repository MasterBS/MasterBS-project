import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { NaverMapView } from "./naver-map-view";
import type { Station } from "@/types/station";

vi.mock("@/lib/naver-loader", () => ({
  loadNaverMaps: vi.fn(),
}));

import { loadNaverMaps } from "@/lib/naver-loader";

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    id: "1",
    name: "테스트주유소",
    brandCode: "SKE",
    brandLabel: "SK에너지",
    price: 1830,
    distance: 850,
    lat: 37.561,
    lng: 127.001,
    isSelfEstimated: false,
    ...overrides,
  };
}

function createFakeNaver() {
  const boundsExtend = vi.fn();
  const mapFitBounds = vi.fn();
  const markerSetMap = vi.fn();
  const mapInstances: unknown[] = [];
  const markerInstances: Array<{ options: Record<string, unknown> }> = [];

  class FakeLatLng {
    lat_: number;
    lng_: number;
    constructor(lat: number, lng: number) {
      this.lat_ = lat;
      this.lng_ = lng;
    }
    lat() {
      return this.lat_;
    }
    lng() {
      return this.lng_;
    }
  }

  class FakeLatLngBounds {
    constructor(_sw: unknown, _ne: unknown) {}
    extend(latlng: unknown) {
      boundsExtend(latlng);
    }
  }

  class FakeMap {
    constructor(container: HTMLElement, options: Record<string, unknown>) {
      mapInstances.push({ container, options });
    }
    fitBounds(bounds: unknown) {
      mapFitBounds(bounds);
    }
    setCenter() {}
  }

  class FakeMarker {
    options: Record<string, unknown>;
    constructor(options: Record<string, unknown>) {
      this.options = options;
      markerInstances.push({ options });
    }
    setMap(map: unknown) {
      markerSetMap(map);
    }
    setIcon() {}
  }

  class FakeSize {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
  }

  const naver = {
    maps: {
      Map: FakeMap,
      LatLng: FakeLatLng,
      LatLngBounds: FakeLatLngBounds,
      Marker: FakeMarker,
      Size: FakeSize,
    },
  };

  return { naver, boundsExtend, mapFitBounds, markerSetMap, mapInstances, markerInstances };
}

describe("NaverMapView [naver]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("[naver] creates one marker for the current location plus one per station, and fits bounds over every point", async () => {
    const fake = createFakeNaver();
    vi.mocked(loadNaverMaps).mockResolvedValue(fake.naver as never);

    const stations = [
      makeStation({ id: "1" }),
      makeStation({ id: "2" }),
      makeStation({ id: "3" }),
      makeStation({ id: "4" }),
      makeStation({ id: "5" }),
    ];

    render(
      <NaverMapView
        clientId="test-client-id"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
      />,
    );

    await waitFor(() => expect(fake.mapFitBounds).toHaveBeenCalledTimes(1));

    // 현재 위치 마커 1개 + 주유소 마커 5개
    expect(fake.markerInstances).toHaveLength(6);
    expect(fake.boundsExtend).toHaveBeenCalledTimes(6);
  });

  it("[naver] gives the selected station's marker a distinguishing icon", async () => {
    const fake = createFakeNaver();
    vi.mocked(loadNaverMaps).mockResolvedValue(fake.naver as never);

    const stations = [
      makeStation({ id: "1", lat: 37.561, lng: 127.001 }),
      makeStation({ id: "2", lat: 37.57, lng: 127.01 }),
    ];

    const { rerender } = render(
      <NaverMapView
        clientId="test-client-id"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId={null}
      />,
    );

    await waitFor(() => expect(fake.mapFitBounds).toHaveBeenCalledTimes(1));
    const stationMarkers = fake.markerInstances.slice(1);
    expect(stationMarkers.every((m) => m.options.icon === undefined)).toBe(true);

    rerender(
      <NaverMapView
        clientId="test-client-id"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId="2"
      />,
    );

    await waitFor(() => expect(fake.mapFitBounds).toHaveBeenCalledTimes(2));

    const rebuiltMarkers = fake.markerInstances.slice(-3);
    const selectedMarker = rebuiltMarkers.find(
      (m) => (m.options.position as { lat_: number })?.lat_ === stations[1].lat,
    );
    expect(selectedMarker?.options.icon).toBeDefined();
  });

  it("[naver] calls onError when the SDK fails to load", async () => {
    vi.mocked(loadNaverMaps).mockRejectedValue(new Error("load failed"));
    const onError = vi.fn();

    render(
      <NaverMapView
        clientId="test-client-id"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={[]}
        onError={onError}
      />,
    );

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
  });
});
