import { afterEach, describe, expect, it, vi } from "vitest";
import { findCheapestStations } from "./stations";

type RawOverrides = Partial<{
  UNI_ID: string;
  POLL_DIV_CD: string;
  OS_NM: string;
  PRICE: number;
  DISTANCE: number;
  GIS_X_COOR: number;
  GIS_Y_COOR: number;
}>;

function makeRaw(overrides: RawOverrides = {}) {
  return {
    UNI_ID: "A0000001",
    POLL_DIV_CD: "SKE",
    OS_NM: "테스트주유소",
    PRICE: 1800,
    DISTANCE: 500,
    GIS_X_COOR: 311923,
    GIS_Y_COOR: 551192,
    ...overrides,
  };
}

function jsonResponse(oil: unknown[]) {
  return new Response(JSON.stringify({ RESULT: { OIL: oil } }), { status: 200 });
}

describe("findCheapestStations [stations]", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it("[S1-3] sorts by price ascending, tie broken by distance ascending", async () => {
    vi.stubEnv("OPINET_API_KEY", "test-key");
    const oil = [
      makeRaw({ UNI_ID: "1", PRICE: 1850, DISTANCE: 1000 }),
      makeRaw({ UNI_ID: "2", PRICE: 1800, DISTANCE: 2000 }),
      makeRaw({ UNI_ID: "3", PRICE: 1800, DISTANCE: 500 }),
      makeRaw({ UNI_ID: "4", PRICE: 1900, DISTANCE: 100 }),
      makeRaw({ UNI_ID: "5", PRICE: 1820, DISTANCE: 300 }),
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(oil));

    const result = await findCheapestStations({ lat: 37.56, lng: 127.0, fuel: "gasoline" });

    expect(result.map((s) => s.id)).toEqual(["3", "2", "5", "1", "4"]);
  });

  it("[INV-1] never returns more than 5 stations even when the API returns more", async () => {
    vi.stubEnv("OPINET_API_KEY", "test-key");
    const oil = Array.from({ length: 8 }, (_, i) => makeRaw({ UNI_ID: String(i), PRICE: 1800 + i }));
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(oil));

    const result = await findCheapestStations({ lat: 37.56, lng: 127.0, fuel: "gasoline" });

    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("[S7-1] returns fewer than 5 when even the widest radius can't fill 5 after filtering", async () => {
    vi.stubEnv("OPINET_API_KEY", "test-key");
    const threeStations = [makeRaw({ UNI_ID: "1" }), makeRaw({ UNI_ID: "2" }), makeRaw({ UNI_ID: "3" })];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(threeStations));

    const result = await findCheapestStations({ lat: 37.56, lng: 127.0, fuel: "gasoline" });

    expect(result).toHaveLength(3);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("[stations] expands radius only until the filtered count reaches 5", async () => {
    vi.stubEnv("OPINET_API_KEY", "test-key");
    const few = [makeRaw({ UNI_ID: "1" }), makeRaw({ UNI_ID: "2" })];
    const enough = Array.from({ length: 5 }, (_, i) => makeRaw({ UNI_ID: `e${i}` }));

    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(few))
      .mockResolvedValueOnce(jsonResponse(enough));

    const result = await findCheapestStations({ lat: 37.56, lng: 127.0, fuel: "gasoline" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallUrl = String(fetchMock.mock.calls[1][0]);
    expect(secondCallUrl).toContain("radius=5000");
    expect(result).toHaveLength(5);
  });

  it("[stations] filters by brand and self-service before counting toward the minimum", async () => {
    vi.stubEnv("OPINET_API_KEY", "test-key");
    const oil = [
      makeRaw({ UNI_ID: "1", POLL_DIV_CD: "SKE", OS_NM: "SK 셀프주유소" }),
      makeRaw({ UNI_ID: "2", POLL_DIV_CD: "GSC", OS_NM: "GS 일반주유소" }),
    ];
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse(oil));

    const result = await findCheapestStations({
      lat: 37.56,
      lng: 127.0,
      fuel: "gasoline",
      brands: ["SKE"],
      selfOnly: true,
    });

    expect(result.map((s) => s.id)).toEqual(["1"]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("[stations] builds request URL with KATEC-converted coordinates and mapped prodcd", async () => {
    vi.stubEnv("OPINET_API_KEY", "test-key");
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonResponse([makeRaw()]));

    await findCheapestStations({ lat: 37.5587543, lng: 127.0008881, fuel: "diesel" });

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.searchParams.get("prodcd")).toBe("D047");
    expect(url.searchParams.get("radius")).toBe("3000");
    expect(Number(url.searchParams.get("x"))).toBeCloseTo(311923, 0);
    expect(Number(url.searchParams.get("y"))).toBeCloseTo(551192, 0);
  });
});
