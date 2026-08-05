import { afterEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useMapProvider } from "./use-map-provider";
import { MAP_PROVIDER_STORAGE_KEY } from "@/config/map-provider";

describe("useMapProvider [provider]", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("[provider] stays unselected when nothing is stored", () => {
    const { result } = renderHook(() => useMapProvider());

    expect(result.current.status).toBe("unselected");
  });

  it("[provider] select() updates state and persists to localStorage", () => {
    const { result } = renderHook(() => useMapProvider());

    act(() => {
      result.current.select("kakao");
    });

    expect(result.current.status).toBe("selected");
    expect(result.current).toMatchObject({ status: "selected", provider: "kakao" });
    expect(localStorage.getItem(MAP_PROVIDER_STORAGE_KEY)).toBe("kakao");
  });

  it("[provider] hydrates from a previously stored provider on mount", () => {
    localStorage.setItem(MAP_PROVIDER_STORAGE_KEY, "naver");

    const { result } = renderHook(() => useMapProvider());

    expect(result.current).toMatchObject({ status: "selected", provider: "naver" });
  });
});
