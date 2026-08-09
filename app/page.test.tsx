import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MapProvider } from "@/types/map-provider";

const useGeolocationMock = vi.fn();
const useStationsMock = vi.fn();
const useSessionMock = vi.fn();
const signInMock = vi.fn();
const useMapProviderMock = vi.fn();

vi.mock("@/hooks/use-geolocation", () => ({
  useGeolocation: () => useGeolocationMock(),
}));
vi.mock("@/hooks/use-stations", () => ({
  useStations: (...args: unknown[]) => useStationsMock(...args),
}));
vi.mock("@/hooks/use-map-provider", () => ({
  useMapProvider: () => useMapProviderMock(),
}));
vi.mock("next-auth/react", () => ({
  useSession: () => useSessionMock(),
  signIn: (...args: unknown[]) => signInMock(...args),
}));
vi.mock("@/components/gas/map-view", () => ({
  MapView: (props: { selectedId?: string | null; provider?: string }) => (
    <div
      data-testid="map-view-mock"
      data-selected-id={props.selectedId ?? ""}
      data-provider={props.provider ?? ""}
    />
  ),
}));

const { default: Page } = await import("./page");

describe("Page [S1-1][S2]", () => {
  beforeEach(() => {
    useGeolocationMock.mockReset();
    useStationsMock.mockReset();
    useSessionMock.mockReset();
    signInMock.mockReset();
    useMapProviderMock.mockReset();
    // 이 describe의 기존 테스트는 전부 "로그인 + 계정에 지도 provider가 이미 정해진 상태에서
    // 검색 화면이 보인다"는 전제라 기본값을 authenticated + naver로 둔다. 로그인/provider
    // 분기 자체는 아래 별도 describe에서 검증.
    useSessionMock.mockReturnValue({ status: "authenticated", data: { userKey: "kakao:1" } });
    useMapProviderMock.mockReturnValue({ status: "loaded", provider: "naver", setProvider: vi.fn() });
    window.localStorage.clear();
  });

  it("[S1-1] shows a loading spinner and 근처 주유소를 찾는 중... while geolocation resolves", () => {
    useGeolocationMock.mockReturnValue({ status: "loading", coords: null, retry: vi.fn() });
    useStationsMock.mockReturnValue({ status: "idle", stations: [], error: null });

    render(<Page />);

    expect(screen.getByText("근처 주유소를 찾는 중…")).toBeInTheDocument();
  });

  it("[S1-1] keeps showing the loading text while stations are fetched after coords resolve", () => {
    useGeolocationMock.mockReturnValue({
      status: "success",
      coords: { lat: 37.56, lng: 127.0 },
      retry: vi.fn(),
    });
    useStationsMock.mockReturnValue({ status: "loading", stations: [], error: null });

    render(<Page />);

    expect(screen.getByText("근처 주유소를 찾는 중…")).toBeInTheDocument();
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

  it("[sso-login S14][S14] shows the profile menu entry point alongside settings", () => {
    useGeolocationMock.mockReturnValue({ status: "denied", coords: null, retry: vi.fn() });
    useStationsMock.mockReturnValue({ status: "idle", stations: [], error: null });

    render(<Page />);

    expect(screen.getByRole("button", { name: "설정" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "프로필" })).toBeInTheDocument();
  });

  it("[map-provider-selection S6] always shows the settings entry point, even when location is denied", () => {
    useGeolocationMock.mockReturnValue({ status: "denied", coords: null, retry: vi.fn() });
    useStationsMock.mockReturnValue({ status: "idle", stations: [], error: null });

    render(<Page />);

    expect(screen.getByRole("button", { name: "설정" })).toBeInTheDocument();
  });

  it("[map-provider-selection S1-1] switching provider in settings replaces the map immediately, without refetching stations", async () => {
    const user = userEvent.setup();
    // 이 테스트만 실제 상태를 갖는 훅처럼 동작해야 설정에서 고른 provider가 리렌더에 반영된다.
    useMapProviderMock.mockImplementation(() => {
      const [provider, setProvider] = useState<MapProvider>("naver");
      return { status: "loaded" as const, provider, setProvider };
    });
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

    expect(await screen.findByTestId("map-view-mock")).toHaveAttribute("data-provider", "naver");

    await user.click(screen.getByRole("button", { name: "설정" }));
    await user.click(await screen.findByRole("radio", { name: "카카오맵" }));

    expect(screen.getByTestId("map-view-mock")).toHaveAttribute("data-provider", "kakao");
    expect(useStationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ lat: 37.56, lng: 127.0 }),
    );
  });
});

describe("Page login gate [sso-login S10][S10][sso-login S3][S3]", () => {
  beforeEach(() => {
    useGeolocationMock.mockReset();
    useStationsMock.mockReset();
    useSessionMock.mockReset();
    signInMock.mockReset();
    useMapProviderMock.mockReset();
    window.localStorage.clear();
  });

  it("[sso-login S10][S10] shows the login gate instead of location/station UI when there is no session", () => {
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null });

    render(<Page />);

    expect(screen.getByText("로그인해야 이용할 수 있어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "카카오로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "네이버로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "구글로 로그인" })).toBeInTheDocument();
    expect(useGeolocationMock).not.toHaveBeenCalled();
    expect(useStationsMock).not.toHaveBeenCalled();
  });

  it("[sso-login S10][S10] shows a full-page spinner (not the login gate or the search screen) while the session is loading", () => {
    useSessionMock.mockReturnValue({ status: "loading", data: null });

    render(<Page />);

    expect(screen.queryByText("로그인해야 이용할 수 있어요")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "카카오로 로그인" })).not.toBeInTheDocument();
    expect(useGeolocationMock).not.toHaveBeenCalled();
  });

  it("[sso-login S3][S3] stays on the login gate after a failed/cancelled sign-in and lets the user try another provider", async () => {
    const user = userEvent.setup();
    useSessionMock.mockReturnValue({ status: "unauthenticated", data: null });

    render(<Page />);

    expect(screen.getByText("로그인해야 이용할 수 있어요")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "카카오로 로그인" }));
    expect(signInMock).toHaveBeenCalledWith("kakao");

    // 실패/취소해도 세션은 여전히 unauthenticated이므로 같은 화면에 남고, 다른 provider를 누를 수 있다.
    expect(screen.getByText("로그인해야 이용할 수 있어요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "네이버로 로그인" }));
    expect(signInMock).toHaveBeenCalledWith("naver");
  });
});

describe("Page map provider branching [sso-login S11][S11][sso-login S12-1][S12-1][sso-login S12-2][S12-2][sso-login S13][S13]", () => {
  beforeEach(() => {
    useGeolocationMock.mockReset();
    useStationsMock.mockReset();
    useSessionMock.mockReset();
    signInMock.mockReset();
    useMapProviderMock.mockReset();
    useSessionMock.mockReturnValue({ status: "authenticated", data: { userKey: "kakao:1" } });
    useGeolocationMock.mockReturnValue({ status: "idle", coords: null, retry: vi.fn() });
    useStationsMock.mockReturnValue({ status: "idle", stations: [], error: null });
    window.localStorage.clear();
  });

  it("[sso-login S11][S11] shows the map provider picker (not the search screen) when the account has no saved provider yet", () => {
    useMapProviderMock.mockReturnValue({ status: "loaded", provider: null, setProvider: vi.fn() });

    render(<Page />);

    expect(screen.getByText("지도 provider를 선택하세요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "카카오맵" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "네이버지도" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "티맵" })).toBeInTheDocument();
    expect(useGeolocationMock).not.toHaveBeenCalled();
  });

  it("[sso-login S12-1][S12-1][sso-login S12-2][S12-2] picking a provider saves it and enters the search screen with that provider", async () => {
    const user = userEvent.setup();
    const setProviderSpy = vi.fn();
    // 실제 상태를 갖는 훅처럼 동작해야 선택 직후 검색 화면으로의 전환(S12-2)을 관찰할 수 있다.
    useMapProviderMock.mockImplementation(() => {
      const [provider, setProvider] = useState<MapProvider | null>(null);
      return {
        status: "loaded" as const,
        provider,
        setProvider: (next: MapProvider) => {
          setProviderSpy(next);
          setProvider(next);
        },
      };
    });

    render(<Page />);
    expect(screen.getByText("지도 provider를 선택하세요")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "네이버지도" }));

    // S12-1: 계정에 저장(호출)됐다
    expect(setProviderSpy).toHaveBeenCalledWith("naver");
    // S12-2: 선택 화면 대신 검색 화면에 진입했다
    expect(screen.queryByText("지도 provider를 선택하세요")).not.toBeInTheDocument();
    expect(screen.getByText("내 주변 저가 주유소 TOP5")).toBeInTheDocument();
  });

  it("[sso-login S13][S13] skips the picker and goes straight to the search screen when the account already has a provider", () => {
    useMapProviderMock.mockReturnValue({ status: "loaded", provider: "naver", setProvider: vi.fn() });

    render(<Page />);

    expect(screen.queryByText("지도 provider를 선택하세요")).not.toBeInTheDocument();
    expect(screen.getByText("내 주변 저가 주유소 TOP5")).toBeInTheDocument();
    expect(useGeolocationMock).toHaveBeenCalled();
  });

  it("shows a full-page spinner while the account's map provider is still loading", () => {
    useMapProviderMock.mockReturnValue({ status: "loading", provider: null, setProvider: vi.fn() });

    render(<Page />);

    expect(screen.queryByText("지도 provider를 선택하세요")).not.toBeInTheDocument();
    expect(screen.queryByText("내 주변 저가 주유소 TOP5")).not.toBeInTheDocument();
    expect(useGeolocationMock).not.toHaveBeenCalled();
  });
});
