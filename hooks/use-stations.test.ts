import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { useStations } from "./use-stations";

function jsonResponse(data: unknown) {
  return new Response(JSON.stringify(data), { status: 200 });
}

describe("useStations retry [S9]", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("[S9] retry() re-fetches even though lat/lng/fuel haven't changed", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse([]));

    const { result } = renderHook(() => useStations({ lat: 37.56, lng: 127.0, fuel: "gasoline" }));

    await waitFor(() => expect(result.current.status).toBe("success"));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.retry();
    });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
