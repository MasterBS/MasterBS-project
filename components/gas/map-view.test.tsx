import { afterEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapView } from "./map-view";
import type { Station } from "@/types/station";

vi.mock("./kakao-map-view", () => ({
  KakaoMapView: vi.fn(() => <div data-testid="kakao-map-view-mock" />),
}));
vi.mock("./naver-map-view", () => ({
  NaverMapView: vi.fn(() => <div data-testid="naver-map-view-mock" />),
}));
vi.mock("./tmap-map-view", () => ({
  TmapMapView: vi.fn(() => <div data-testid="tmap-map-view-mock" />),
}));

import { KakaoMapView } from "./kakao-map-view";
import { NaverMapView } from "./naver-map-view";
import { TmapMapView } from "./tmap-map-view";

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
        tmapAppKey="tmap-key"
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
    expect(TmapMapView).not.toHaveBeenCalled();
  });

  it("[S1-2] renders NaverMapView with the naver client id when provider is naver", () => {
    const stations = [makeStation()];
    render(
      <MapView
        provider="naver"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
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
    expect(TmapMapView).not.toHaveBeenCalled();
  });

  it("[tmap-provider-integration S1-2] renders TmapMapView with the tmap app key when provider is tmap, forwarding the same current-location marker and stations pins as kakao/naver", () => {
    const stations = [makeStation()];
    render(
      <MapView
        provider="tmap"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId="1"
      />,
    );

    expect(TmapMapView).toHaveBeenCalledWith(
      expect.objectContaining({
        appKey: "tmap-key",
        currentLocation: { lat: 37.56, lng: 127.0 },
        stations,
        selectedId: "1",
      }),
      undefined,
    );
    expect(KakaoMapView).not.toHaveBeenCalled();
    expect(NaverMapView).not.toHaveBeenCalled();
  });

  it("[tmap-provider-integration S1-3] forwards selectedId to TmapMapView so the tapped station's pin can be highlighted", () => {
    const stations = [makeStation({ id: "1" }), makeStation({ id: "2" })];
    const { rerender } = render(
      <MapView
        provider="tmap"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId={null}
      />,
    );
    expect(vi.mocked(TmapMapView).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ selectedId: null }),
    );

    rerender(
      <MapView
        provider="tmap"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={stations}
        selectedId="2"
      />,
    );
    expect(vi.mocked(TmapMapView).mock.calls.at(-1)?.[0]).toEqual(
      expect.objectContaining({ selectedId: "2" }),
    );
  });

  it("[INV-1][tmap-provider-integration INV-1] forwards the same currentLocation and stations to whichever provider is active", () => {
    const stations = [makeStation({ id: "1" }), makeStation({ id: "2" })];
    const currentLocation = { lat: 37.5, lng: 127.1 };

    const { rerender } = render(
      <MapView
        provider="kakao"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
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
        tmapAppKey="tmap-key"
        currentLocation={currentLocation}
        stations={stations}
      />,
    );
    const naverCallProps = vi.mocked(NaverMapView).mock.calls.at(-1)?.[0];

    expect(naverCallProps?.currentLocation).toEqual(kakaoCallProps?.currentLocation);
    expect(naverCallProps?.stations).toEqual(kakaoCallProps?.stations);

    rerender(
      <MapView
        provider="tmap"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
        currentLocation={currentLocation}
        stations={stations}
      />,
    );
    const tmapCallProps = vi.mocked(TmapMapView).mock.calls.at(-1)?.[0];

    expect(tmapCallProps?.currentLocation).toEqual(kakaoCallProps?.currentLocation);
    expect(tmapCallProps?.stations).toEqual(kakaoCallProps?.stations);
  });
});

function FailingProvider({ onError }: { onError?: () => void }) {
  useEffect(() => {
    onError?.();
  }, [onError]);
  return <div data-testid="failing-provider-mock" />;
}

describe("MapView [S5-1][S5-2]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("[S5-1] shows an error message and retry button when the SDK fails to load", async () => {
    vi.mocked(KakaoMapView).mockImplementation(FailingProvider as never);

    render(
      <MapView
        provider="kakao"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={[]}
      />,
    );

    expect(
      await screen.findByText("지도를 불러오지 못했어요. 다시 시도해주세요"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("[S5-2] does not switch provider automatically; retry re-attempts the same provider", async () => {
    const user = userEvent.setup();
    vi.mocked(KakaoMapView).mockImplementation(FailingProvider as never);

    render(
      <MapView
        provider="kakao"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={[]}
      />,
    );

    await screen.findByText("지도를 불러오지 못했어요. 다시 시도해주세요");
    expect(NaverMapView).not.toHaveBeenCalled();
    expect(KakaoMapView).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(KakaoMapView).toHaveBeenCalledTimes(2));
    expect(NaverMapView).not.toHaveBeenCalled();
  });

  it("[tmap-provider-integration S4-1] shows the same error message and retry button when the tmap SDK fails to load", async () => {
    vi.mocked(TmapMapView).mockImplementation(FailingProvider as never);

    render(
      <MapView
        provider="tmap"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={[]}
      />,
    );

    expect(
      await screen.findByText("지도를 불러오지 못했어요. 다시 시도해주세요"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("[tmap-provider-integration S4-2] does not switch away from tmap automatically; retry re-attempts tmap", async () => {
    const user = userEvent.setup();
    vi.mocked(TmapMapView).mockImplementation(FailingProvider as never);

    render(
      <MapView
        provider="tmap"
        kakaoAppKey="kakao-key"
        naverClientId="naver-key"
        tmapAppKey="tmap-key"
        currentLocation={{ lat: 37.56, lng: 127.0 }}
        stations={[]}
      />,
    );

    await screen.findByText("지도를 불러오지 못했어요. 다시 시도해주세요");
    expect(KakaoMapView).not.toHaveBeenCalled();
    expect(NaverMapView).not.toHaveBeenCalled();
    expect(TmapMapView).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(TmapMapView).toHaveBeenCalledTimes(2));
    expect(KakaoMapView).not.toHaveBeenCalled();
    expect(NaverMapView).not.toHaveBeenCalled();
  });
});
