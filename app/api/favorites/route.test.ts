import { afterEach, describe, expect, it, vi } from "vitest";
import type { Favorite } from "@/types/favorite";

const authMock = vi.fn();
const listFavoritesMock = vi.fn();
const toggleFavoriteMock = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));
vi.mock("@/services/favorites", () => ({
  listFavorites: (...args: unknown[]) => listFavoritesMock(...args),
  toggleFavorite: (...args: unknown[]) => toggleFavoriteMock(...args),
}));

const { GET, POST } = await import("./route");

const FAVORITE: Favorite = {
  id: "1",
  userKey: "kakao:123",
  stationUniId: "A0001234",
  name: "구인주유소",
  brandLabel: "SK에너지",
  lat: 37.5,
  lng: 127.0,
  price: 1834,
  createdAt: "2026-08-09T00:00:00.000Z",
};

describe("GET/POST /api/favorites [sso-login] [favorites-route]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(listFavoritesMock).not.toHaveBeenCalled();
  });

  it("GET returns the session's favorites list", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });
    listFavoritesMock.mockResolvedValue([FAVORITE]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual([FAVORITE]);
    expect(listFavoritesMock).toHaveBeenCalledWith("kakao:123");
  });

  it("POST returns 401 when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const res = await POST(new Request("http://localhost/api/favorites", { method: "POST", body: "{}" }));

    expect(res.status).toBe(401);
    expect(toggleFavoriteMock).not.toHaveBeenCalled();
  });

  it("POST toggles the favorite for the session's userKey with the request body", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });
    toggleFavoriteMock.mockResolvedValue({ favorited: true });

    const snapshot = {
      stationUniId: "A0001234",
      name: "구인주유소",
      brandLabel: "SK에너지",
      lat: 37.5,
      lng: 127.0,
      price: 1834,
    };

    const res = await POST(
      new Request("http://localhost/api/favorites", { method: "POST", body: JSON.stringify(snapshot) }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ favorited: true });
    expect(toggleFavoriteMock).toHaveBeenCalledWith("kakao:123", snapshot);
  });

  it("POST returns 400 and does not toggle when stationUniId is missing", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });

    const res = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        body: JSON.stringify({ name: "구인주유소", brandLabel: "SK에너지", lat: 37.5, lng: 127.0, price: 1834 }),
      }),
    );

    expect(res.status).toBe(400);
    expect(toggleFavoriteMock).not.toHaveBeenCalled();
  });

  it("POST returns 400 and does not toggle when lat/lng/price are not numbers", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });

    const res = await POST(
      new Request("http://localhost/api/favorites", {
        method: "POST",
        body: JSON.stringify({
          stationUniId: "A0001234",
          name: "구인주유소",
          brandLabel: "SK에너지",
          lat: "not-a-number",
          lng: 127.0,
          price: 1834,
        }),
      }),
    );

    expect(res.status).toBe(400);
    expect(toggleFavoriteMock).not.toHaveBeenCalled();
  });
});
