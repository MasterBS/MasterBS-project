import { beforeEach, describe, expect, it, vi } from "vitest";
import { useEffect } from "react";
import { render, screen } from "@testing-library/react";

const useGeolocationMock = vi.fn();
const useStationsMock = vi.fn();

vi.mock("@/hooks/use-geolocation", () => ({
  useGeolocation: () => useGeolocationMock(),
}));
vi.mock("@/hooks/use-stations", () => ({
  useStations: (...args: unknown[]) => useStationsMock(...args),
}));

function FailingKakaoMapView({ onError }: { onError?: () => void }) {
  useEffect(() => {
    onError?.();
  }, [onError]);
  return <div data-testid="kakao-map-view-mock" />;
}

vi.mock("@/components/gas/kakao-map-view", () => ({
  KakaoMapView: FailingKakaoMapView,
}));
vi.mock("@/components/gas/naver-map-view", () => ({
  NaverMapView: FailingKakaoMapView,
}));

const { default: Page } = await import("./page");

describe("Page map SDK failure [S5-2]", () => {
  beforeEach(() => {
    useGeolocationMock.mockReset();
    useStationsMock.mockReset();
    window.localStorage.clear();
  });

  it("[S5-2] keeps the station list visible and unaffected while the map shows its error state", async () => {
    useGeolocationMock.mockReturnValue({
      status: "success",
      coords: { lat: 37.56, lng: 127.0 },
      retry: vi.fn(),
    });
    useStationsMock.mockReturnValue({
      status: "success",
      stations: [
        {
          id: "1",
          name: "1위주유소",
          brandCode: "SKE",
          brandLabel: "SK에너지",
          price: 1800,
          distance: 500,
          lat: 37.56,
          lng: 127.0,
          isSelfEstimated: false,
        },
      ],
      error: null,
    });

    render(<Page />);

    expect(
      await screen.findByText("지도를 불러오지 못했어요. 다시 시도해주세요"),
    ).toBeInTheDocument();

    // 지도 에러와 무관하게 리스트는 정상 표시된다
    expect(screen.getByText("1위주유소")).toBeInTheDocument();
    expect(screen.getByText("1,800원")).toBeInTheDocument();
    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });
});
