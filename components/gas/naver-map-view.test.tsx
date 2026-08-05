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
    _lat: number;
    _lng: number;
    constructor(lat: number, lng: number) {
      this._lat = lat;
      this._lng = lng;
    }
    lat() {
      return this._lat;
    }
    lng() {
      return this._lng;
    }
  }

  class FakeLatLngBounds {
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
    setZIndex() {}
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

describe("NaverMapView [S5-1][S5-2][INV-1]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("[S5-1][INV-1] creates one marker for the current location plus one per station, and fits bounds over every point", async () => {
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
      <NaverMapView appKey="test-key" currentLocation={{ lat: 37.56, lng: 127.0 }} stations={stations} />,
    );

    await waitFor(() => expect(fake.mapFitBounds).toHaveBeenCalledTimes(1));

    // 현재 위치 마커 1개 + 주유소 마커 5개 — 카카오 버전(map-view.test.tsx)과 동일한 개수 계약
    expect(fake.markerInstances).toHaveLength(6);
    // 현재 위치 + 주유소 5곳 = 6개 지점 모두 bounds에 포함
    expect(fake.boundsExtend).toHaveBeenCalledTimes(6);
  });

  it("[S5-2][INV-1] gives the selected station's marker a distinguishing icon and higher zIndex", async () => {
    const fake = createFakeNaver();
    vi.mocked(loadNaverMaps).mockResolvedValue(fake.naver as never);

    const stations = [
      makeStation({ id: "1", lat: 37.561, lng: 127.001 }),
      makeStation({ id: "2", lat: 37.57, lng: 127.01 }),
    ];

    const { rerender } = render(
      <NaverMapView
        appKey="test-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId={null}
      />,
    );

    await waitFor(() => expect(fake.mapFitBounds).toHaveBeenCalledTimes(1));
    // 첫 마커는 현재 위치(항상 고유 아이콘을 가짐) — 주유소 마커만 검사
    const stationMarkers = fake.markerInstances.slice(1);
    expect(stationMarkers.every((m) => m.options.icon === undefined)).toBe(true);

    rerender(
      <NaverMapView
        appKey="test-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId="2"
      />,
    );

    await waitFor(() => expect(fake.mapFitBounds).toHaveBeenCalledTimes(2));

    const rebuiltMarkers = fake.markerInstances.slice(-3); // 현재위치 + station 1 + station 2 (재생성)
    const selectedMarker = rebuiltMarkers.find(
      (m) => (m.options.position as { _lat: number })?._lat === stations[1].lat,
    );
    expect(selectedMarker?.options.icon).toBeDefined();
    expect(selectedMarker?.options.zIndex).toBeGreaterThan(2);
  });
});
