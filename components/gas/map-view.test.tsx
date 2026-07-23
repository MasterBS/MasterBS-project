import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MapView } from "./map-view";
import type { Station } from "@/types/station";

vi.mock("@/lib/kakao-loader", () => ({
  loadKakaoMaps: vi.fn(),
}));

import { loadKakaoMaps } from "@/lib/kakao-loader";

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

function createFakeKakao() {
  const boundsExtend = vi.fn();
  const mapSetBounds = vi.fn();
  const markerSetMap = vi.fn();
  const mapInstances: unknown[] = [];
  const markerInstances: Array<{ options: Record<string, unknown> }> = [];

  class FakeLatLng {
    lat: number;
    lng: number;
    constructor(lat: number, lng: number) {
      this.lat = lat;
      this.lng = lng;
    }
    getLat() {
      return this.lat;
    }
    getLng() {
      return this.lng;
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
    setBounds(bounds: unknown) {
      mapSetBounds(bounds);
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
    setImage() {}
    setZIndex() {}
  }

  class FakeMarkerImage {
    src: string;
    size: unknown;
    constructor(src: string, size: unknown) {
      this.src = src;
      this.size = size;
    }
  }

  class FakeSize {
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
    }
  }

  const kakao = {
    maps: {
      load: (cb: () => void) => cb(),
      Map: FakeMap,
      LatLng: FakeLatLng,
      LatLngBounds: FakeLatLngBounds,
      Marker: FakeMarker,
      MarkerImage: FakeMarkerImage,
      Size: FakeSize,
    },
  };

  return { kakao, boundsExtend, mapSetBounds, markerSetMap, mapInstances, markerInstances };
}

describe("MapView [S1-4][S5]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("[S1-4] creates one marker for the current location plus one per station, and fits bounds over every point", async () => {
    const fake = createFakeKakao();
    vi.mocked(loadKakaoMaps).mockResolvedValue(fake.kakao as never);

    const stations = [
      makeStation({ id: "1" }),
      makeStation({ id: "2" }),
      makeStation({ id: "3" }),
      makeStation({ id: "4" }),
      makeStation({ id: "5" }),
    ];

    render(
      <MapView appKey="test-key" currentLocation={{ lat: 37.56, lng: 127.0 }} stations={stations} />,
    );

    await waitFor(() => expect(fake.mapSetBounds).toHaveBeenCalledTimes(1));

    // 현재 위치 마커 1개 + 주유소 마커 5개
    expect(fake.markerInstances).toHaveLength(6);
    // 현재 위치 + 주유소 5곳 = 6개 지점 모두 bounds에 포함
    expect(fake.boundsExtend).toHaveBeenCalledTimes(6);
  });

  it("[S5] gives the selected station's marker a distinguishing image and higher zIndex", async () => {
    const fake = createFakeKakao();
    vi.mocked(loadKakaoMaps).mockResolvedValue(fake.kakao as never);

    const stations = [
      makeStation({ id: "1", lat: 37.561, lng: 127.001 }),
      makeStation({ id: "2", lat: 37.57, lng: 127.01 }),
    ];

    const { rerender } = render(
      <MapView
        appKey="test-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId={null}
      />,
    );

    await waitFor(() => expect(fake.mapSetBounds).toHaveBeenCalledTimes(1));
    // 첫 마커는 현재 위치(항상 고유 이미지를 가짐) — 주유소 마커만 검사
    const stationMarkers = fake.markerInstances.slice(1);
    expect(stationMarkers.every((m) => m.options.image === undefined)).toBe(true);

    rerender(
      <MapView
        appKey="test-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId="2"
      />,
    );

    await waitFor(() => expect(fake.mapSetBounds).toHaveBeenCalledTimes(2));

    const rebuiltMarkers = fake.markerInstances.slice(-3); // 현재위치 + station 1 + station 2 (재생성)
    const selectedMarker = rebuiltMarkers.find(
      (m) => (m.options.position as { lat: number })?.lat === stations[1].lat,
    );
    expect(selectedMarker?.options.image).toBeDefined();
    expect(selectedMarker?.options.zIndex).toBeGreaterThan(2);
  });
});
