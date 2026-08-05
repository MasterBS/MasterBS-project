import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MapView } from "./map-view";
import type { Station } from "@/types/station";

vi.mock("./kakao-map-view", () => ({
  MapView: (props: { appKey: string }) => (
    <div data-testid="kakao-map-view-mock" data-app-key={props.appKey} />
  ),
}));
vi.mock("./naver-map-view", () => ({
  NaverMapView: (props: { appKey: string }) => (
    <div data-testid="naver-map-view-mock" data-app-key={props.appKey} />
  ),
}));

const STATIONS: Station[] = [];
const CURRENT_LOCATION = { lat: 37.56, lng: 127.0 };

describe("MapView dispatcher [map-view]", () => {
  it("[map-view] renders KakaoMapView with the kakao app key when provider is kakao", () => {
    render(
      <MapView
        provider="kakao"
        kakaoAppKey="kakao-key"
        naverAppKey="naver-key"
        currentLocation={CURRENT_LOCATION}
        stations={STATIONS}
      />,
    );

    expect(screen.getByTestId("kakao-map-view-mock")).toHaveAttribute("data-app-key", "kakao-key");
    expect(screen.queryByTestId("naver-map-view-mock")).not.toBeInTheDocument();
  });

  it("[map-view] renders NaverMapView with the naver app key when provider is naver", () => {
    render(
      <MapView
        provider="naver"
        kakaoAppKey="kakao-key"
        naverAppKey="naver-key"
        currentLocation={CURRENT_LOCATION}
        stations={STATIONS}
      />,
    );

    expect(screen.getByTestId("naver-map-view-mock")).toHaveAttribute("data-app-key", "naver-key");
    expect(screen.queryByTestId("kakao-map-view-mock")).not.toBeInTheDocument();
  });
});
