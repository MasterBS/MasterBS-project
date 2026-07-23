import { afterEach, describe, expect, it, vi } from "vitest";
import type { Station } from "@/types/station";

const findCheapestStationsMock = vi.fn<(...args: unknown[]) => Promise<Station[]>>();

vi.mock("@/services/stations", () => ({
  findCheapestStations: (...args: unknown[]) => findCheapestStationsMock(...args),
}));

const { GET } = await import("./route");

function request(query: string) {
  return new Request(`http://localhost/api/stations${query}`);
}

describe("GET /api/stations [stations]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the service result as JSON with default fuel=gasoline", async () => {
    const stations: Station[] = [
      {
        id: "1",
        name: "테스트주유소",
        brandCode: "SKE",
        brandLabel: "SK에너지",
        price: 1800,
        distance: 500,
        lat: 37.56,
        lng: 127.0,
        isSelfEstimated: false,
      },
    ];
    findCheapestStationsMock.mockResolvedValue(stations);

    const res = await GET(request("?lat=37.56&lng=127.0"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(stations);
    expect(findCheapestStationsMock).toHaveBeenCalledWith(
      expect.objectContaining({ lat: 37.56, lng: 127.0, fuel: "gasoline" }),
    );
  });

  it("parses brands and selfOnly from the query string", async () => {
    findCheapestStationsMock.mockResolvedValue([]);

    await GET(request("?lat=37.56&lng=127.0&fuel=diesel&brands=SKE,GSC&selfOnly=true"));

    expect(findCheapestStationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        fuel: "diesel",
        brands: ["SKE", "GSC"],
        selfOnly: true,
      }),
    );
  });

  it("returns 400 when lat/lng is missing or invalid", async () => {
    const res = await GET(request("?lat=notanumber&lng=127.0"));

    expect(res.status).toBe(400);
    expect(findCheapestStationsMock).not.toHaveBeenCalled();
  });

  it("returns 400 when fuel is not one of the known fuel types", async () => {
    const res = await GET(request("?lat=37.56&lng=127.0&fuel=hydrogen"));

    expect(res.status).toBe(400);
    expect(findCheapestStationsMock).not.toHaveBeenCalled();
  });

  it("returns a 5xx JSON error when the upstream service call fails", async () => {
    findCheapestStationsMock.mockRejectedValue(new Error("오피넷 API 호출 실패: 500"));

    const res = await GET(request("?lat=37.56&lng=127.0"));
    const body = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(body.error).toContain("오피넷");
  });
});
