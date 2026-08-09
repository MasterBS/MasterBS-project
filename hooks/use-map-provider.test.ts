import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMapProvider } from "./use-map-provider";

const fetchMock = vi.fn();

describe("useMapProvider [sso-login S11][S11][sso-login S12-1][S12-1][sso-login S13][S13]", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts in loading status and fetches GET /api/user-settings", async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(null) });

    const { result } = renderHook(() => useMapProvider());

    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(fetchMock).toHaveBeenCalledWith("/api/user-settings");
  });

  it("[sso-login S11][S11] provider is null once loaded when the account has no map_provider yet", async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(null) });

    const { result } = renderHook(() => useMapProvider());

    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.provider).toBeNull();
  });

  it("[sso-login S13][S13] provider reflects the account's saved map_provider once loaded", async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          userKey: "kakao:1",
          fuelType: "gasoline",
          brands: [],
          mapProvider: "naver",
          updatedAt: "2026-08-09T00:00:00.000Z",
        }),
    });

    const { result } = renderHook(() => useMapProvider());

    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.provider).toBe("naver");
  });

  it("[sso-login S12-1][S12-1] setProvider optimistically updates the provider and PUTs it to the account", async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve(null) });
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useMapProvider());
    await waitFor(() => expect(result.current.status).toBe("loaded"));

    act(() => {
      result.current.setProvider("kakao");
    });

    expect(result.current.provider).toBe("kakao");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/user-settings",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ mapProvider: "kakao" }),
      }),
    );
  });
});
