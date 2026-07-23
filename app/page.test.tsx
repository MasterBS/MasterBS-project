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

    expect(screen.getByTestId("map-view-mock")).toHaveAttribute("data-selected-id", "");

    await user.click(screen.getByText("2위주유소"));

    expect(screen.getByTestId("map-view-mock")).toHaveAttribute("data-selected-id", "2");
  });
});
