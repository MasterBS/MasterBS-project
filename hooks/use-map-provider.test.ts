import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useMapProvider } from "./use-map-provider";
import { MAP_PROVIDER_STORAGE_KEY } from "@/config/map-provider";

describe("useMapProvider [S3][S4]", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("[S3] defaults to naver when nothing is stored", async () => {
    const { result } = renderHook(() => useMapProvider());

    await waitFor(() => expect(result.current.provider).toBe("naver"));
  });

  it("[S4] applies the stored provider on mount", async () => {
    window.localStorage.setItem(MAP_PROVIDER_STORAGE_KEY, "kakao");

    const { result } = renderHook(() => useMapProvider());

    await waitFor(() => expect(result.current.provider).toBe("kakao"));
  });

  it("[S4] persists the provider to localStorage when changed", async () => {
    const { result } = renderHook(() => useMapProvider());

    await waitFor(() => expect(result.current.provider).toBe("naver"));

    act(() => {
      result.current.setProvider("kakao");
    });

    expect(result.current.provider).toBe("kakao");
    expect(window.localStorage.getItem(MAP_PROVIDER_STORAGE_KEY)).toBe("kakao");
  });

  it("[tmap-provider-integration S3] applies a stored tmap provider on mount", async () => {
    window.localStorage.setItem(MAP_PROVIDER_STORAGE_KEY, "tmap");

    const { result } = renderHook(() => useMapProvider());

    await waitFor(() => expect(result.current.provider).toBe("tmap"));
  });

  it("[tmap-provider-integration S3] persists tmap to localStorage when selected", async () => {
    const { result } = renderHook(() => useMapProvider());

    await waitFor(() => expect(result.current.provider).toBe("naver"));

    act(() => {
      result.current.setProvider("tmap");
    });

    expect(result.current.provider).toBe("tmap");
    expect(window.localStorage.getItem(MAP_PROVIDER_STORAGE_KEY)).toBe("tmap");
  });
});
