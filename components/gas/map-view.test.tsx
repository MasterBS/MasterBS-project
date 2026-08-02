import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { MapView } from "./map-view";
import type { Station } from "@/types/station";

vi.mock("./kakao-map-view", () => ({
  KakaoMapView: vi.fn(() => <div data-testid="kakao-map-view-mock" />),
}));
vi.mock("./naver-map-view", () => ({
  NaverMapView: vi.fn(() => <div data-testid="naver-map-view-mock" />),
}));

import { KakaoMapView } from "./kakao-map-view";
import { NaverMapView } from "./naver-map-view";

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

describe("MapView [S1-2][INV-1]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("[S1-2] renders KakaoMapView with the kakao app key when provider is kakao", () => {
    const stations = [makeStation()];
    render(
      <MapView
        provider="kakao"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId="1"
      />,
    );

    expect(KakaoMapView).toHaveBeenCalledWith(
      expect.objectContaining({
        appKey: "kakao-key",
        currentLocation: { lat: 37.56, lng: 127.0 },
        stations,
        selectedId: "1",
      }),
      undefined,
    );
    expect(NaverMapView).not.toHaveBeenCalled();
  });

  it("[S1-2] renders NaverMapView with the naver client id when provider is naver", () => {
    const stations = [makeStation()];
    render(
      <MapView
        provider="naver"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId="1"
      />,
    );

    expect(NaverMapView).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "naver-key",
        currentLocation: { lat: 37.56, lng: 127.0 },
        stations,
        selectedId: "1",
      }),
      undefined,
    );
    expect(KakaoMapView).not.toHaveBeenCalled();
  });

  it("[INV-1] forwards the same currentLocation and stations to whichever provider is active", () => {
    const stations = [makeStation({ id: "1" }), makeStation({ id: "2" })];
    const currentLocation = { lat: 37.5, lng: 127.1 };

    const { rerender } = render(
      <MapView
        provider="kakao"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        currentLocation={currentLocation}
        stations={stations}
      />,
    );
    const kakaoCallProps = vi.mocked(KakaoMapView).mock.calls.at(-1)?.[0];

    rerender(
      <MapView
        provider="naver"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        currentLocation={currentLocation}
        stations={stations}
      />,
    );
    const naverCallProps = vi.mocked(NaverMapView).mock.calls.at(-1)?.[0];

    expect(naverCallProps?.currentLocation).toEqual(kakaoCallProps?.currentLocation);
    expect(naverCallProps?.stations).toEqual(kakaoCallProps?.stations);
  });
});
