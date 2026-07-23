import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const useGeolocationMock = vi.fn();
const useStationsMock = vi.fn();

vi.mock("@/hooks/use-geolocation", () => ({
  useGeolocation: () => useGeolocationMock(),
}));
vi.mock("@/hooks/use-stations", () => ({
  useStations: (...args: unknown[]) => useStationsMock(...args),
}));
vi.mock("@/components/gas/map-view", () => ({
  MapView: (props: { selectedId?: string | null }) => (
    <div data-testid="map-view-mock" data-selected-id={props.selectedId ?? ""} />
  ),
}));

const { default: Page } = await import("./page");

describe("Page [S1-1][S2]", () => {
  beforeEach(() => {
    useGeolocationMock.mockReset();
    useStationsMock.mockReset();
  });

  it("[S1-1] shows a loading spinner and 근처 주유소를 찾는 중... while geolocation resolves", () => {
    useGeolocationMock.mockReturnValue({ status: "loading", coords: null, retry: vi.fn() });
    useStationsMock.mockReturnValue({ status: "idle", stations: [], error: null });

    render(<Page />);

    expect(screen.getByText("근처 주유소를 찾는 중...")).toBeInTheDocument();
  });

  it("[S1-1] keeps showing the loading text while stations are fetched after coords resolve", () => {
    useGeolocationMock.mockReturnValue({
      status: "success",
      coords: { lat: 37.56, lng: 127.0 },
      retry: vi.fn(),
    });
    useStationsMock.mockReturnValue({ status: "loading", stations: [], error: null });

    render(<Page />);

    expect(screen.getByText("근처 주유소를 찾는 중...")).toBeInTheDocument();
  });

  it("[S2] passes the newly selected fuel to useStations when the fuel toggle changes", async () => {
    const user = userEvent.setup();
    useGeolocationMock.mockReturnValue({
      status: "success",
      coords: { lat: 37.56, lng: 127.0 },
      retry: vi.fn(),
    });
    useStationsMock.mockReturnValue({ status: "success", stations: [], error: null });

    render(<Page />);

    expect(useStationsMock).toHaveBeenLastCalledWith(expect.objectContaining({ fuel: "gasoline" }));

    await user.click(screen.getByRole("radio", { name: "경유" }));

    expect(useStationsMock).toHaveBeenLastCalledWith(expect.objectContaining({ fuel: "diesel" }));
  });

  it("[S5] shares selection state: clicking a station in the list updates the map's selectedId", async () => {
    const user = userEvent.setup();
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
        {
          id: "2",
          name: "2위주유소",
          brandCode: "GSC",
          brandLabel: "GS칼텍스",
          price: 1810,
          distance: 600,
          lat: 37.57,
          lng: 127.01,
          isSelfEstimated: false,
        },
      ],
      error: null,
    });

    render(<Page />);

    expect(await screen.findByTestId("map-view-mock")).toHaveAttribute("data-selected-id", "");

    await user.click(screen.getByText("2위주유소"));

    expect(screen.getByTestId("map-view-mock")).toHaveAttribute("data-selected-id", "2");
  });

  it("[S3] unchecking a brand filter re-calls useStations with the remaining brands", async () => {
    const user = userEvent.setup();
    useGeolocationMock.mockReturnValue({
      status: "success",
      coords: { lat: 37.56, lng: 127.0 },
      retry: vi.fn(),
    });
    useStationsMock.mockReturnValue({ status: "success", stations: [], error: null });

    render(<Page />);

    expect(useStationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ brands: ["SKE", "GSC", "HDO", "SOL", "ETC"] }),
    );

    await user.click(screen.getByLabelText("GS칼텍스"));

    expect(useStationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ brands: ["SKE", "HDO", "SOL", "ETC"] }),
    );
  });

  it("[S4-1] turning on the self-service filter re-calls useStations with selfOnly=true", async () => {
    const user = userEvent.setup();
    useGeolocationMock.mockReturnValue({
      status: "success",
      coords: { lat: 37.56, lng: 127.0 },
      retry: vi.fn(),
    });
    useStationsMock.mockReturnValue({ status: "success", stations: [], error: null });

    render(<Page />);

    expect(useStationsMock).toHaveBeenLastCalledWith(expect.objectContaining({ selfOnly: false }));

    await user.click(screen.getByLabelText("셀프주유소만 보기"));

    expect(useStationsMock).toHaveBeenLastCalledWith(expect.objectContaining({ selfOnly: true }));
  });

  it("[S8] shows the location-denied message and retries geolocation on click, with no fuel toggle/list/map", async () => {
    const user = userEvent.setup();
    const geolocationRetry = vi.fn();
    useGeolocationMock.mockReturnValue({ status: "denied", coords: null, retry: geolocationRetry });
    useStationsMock.mockReturnValue({ status: "idle", stations: [], error: null, retry: vi.fn() });

    render(<Page />);

    expect(screen.getByText("위치 권한이 필요해요")).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "휘발유" })).not.toBeInTheDocument();
    expect(screen.queryByTestId("map-view-mock")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(geolocationRetry).toHaveBeenCalledTimes(1);
  });

  it("[S9] shows the API-error message and retries the station fetch on click", async () => {
    const user = userEvent.setup();
    const stationsRetry = vi.fn();
    useGeolocationMock.mockReturnValue({
      status: "success",
      coords: { lat: 37.56, lng: 127.0 },
      retry: vi.fn(),
    });
    useStationsMock.mockReturnValue({
      status: "error",
      stations: [],
      error: "가격 정보를 불러오지 못했어요.",
      retry: stationsRetry,
    });

    render(<Page />);

    expect(screen.getByText("가격 정보를 불러오지 못했어요")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "다시 시도" }));

    expect(stationsRetry).toHaveBeenCalledTimes(1);
  });

  it("[S7-2] shows the empty-results message when the fetch succeeds with 0 stations", () => {
    useGeolocationMock.mockReturnValue({
      status: "success",
      coords: { lat: 37.56, lng: 127.0 },
      retry: vi.fn(),
    });
    useStationsMock.mockReturnValue({ status: "success", stations: [], error: null, retry: vi.fn() });

    render(<Page />);

    expect(screen.getByText("10km 내에 조건에 맞는 주유소가 없어요")).toBeInTheDocument();
    expect(screen.queryByTestId("map-view-mock")).not.toBeInTheDocument();
  });

  it("[S7-2] shows the partial-results banner alongside the list when fewer than 5 stations are found", () => {
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
      retry: vi.fn(),
    });

    render(<Page />);

    expect(screen.getByText("10km 내 1곳만 찾았어요")).toBeInTheDocument();
    expect(screen.getByText("1위주유소")).toBeInTheDocument();
  });
});
