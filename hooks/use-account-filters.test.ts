import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useAccountFilters } from "./use-account-filters";

const fetchMock = vi.fn();

describe("useAccountFilters [sso-login S5][S5][sso-login S6][S6]", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with gasoline + all brands before the account fetch resolves", () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(null) });

    const { result } = renderHook(() => useAccountFilters());

    expect(result.current.status).toBe("loading");
    expect(result.current.fuel).toBe("gasoline");
    expect(result.current.brands).toEqual(["SKE", "GSC", "HDO", "SOL", "ETC"]);
  });

  it("[sso-login S5][S5] keeps device defaults when the account has no saved filters yet (first login)", async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(null) });

    const { result } = renderHook(() => useAccountFilters());

    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.fuel).toBe("gasoline");
    expect(result.current.brands).toEqual(["SKE", "GSC", "HDO", "SOL", "ETC"]);
  });

  it("[sso-login S5][S5] setFuel/setBrands optimistically update and PUT the change to the account", async () => {
    fetchMock.mockResolvedValueOnce({ json: () => Promise.resolve(null) });
    fetchMock.mockResolvedValue({ json: () => Promise.resolve({}) });

    const { result } = renderHook(() => useAccountFilters());
    await waitFor(() => expect(result.current.status).toBe("loaded"));

    act(() => {
      result.current.setFuel("diesel");
    });
    expect(result.current.fuel).toBe("diesel");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/user-settings",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ fuelType: "diesel" }) }),
    );

    act(() => {
      result.current.setBrands(["SKE"]);
    });
    expect(result.current.brands).toEqual(["SKE"]);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/user-settings",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ brands: ["SKE"] }) }),
    );
  });

  it("[sso-login S6][S6] applies the account's saved filters (from another device) once loaded", async () => {
    fetchMock.mockResolvedValue({
      json: () =>
        Promise.resolve({
          userKey: "kakao:1",
          fuelType: "diesel",
          brands: ["GSC", "HDO"],
          mapProvider: "naver",
          updatedAt: "2026-08-09T00:00:00.000Z",
        }),
    });

    const { result } = renderHook(() => useAccountFilters());

    await waitFor(() => expect(result.current.status).toBe("loaded"));
    expect(result.current.fuel).toBe("diesel");
    expect(result.current.brands).toEqual(["GSC", "HDO"]);
  });
});
