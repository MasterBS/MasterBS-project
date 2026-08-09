import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { FavoritesList } from "./favorites-list";
import type { Favorite } from "@/types/favorite";

const fetchMock = vi.fn();

const FAVORITES: Favorite[] = [
  {
    id: "1",
    userKey: "kakao:1",
    stationUniId: "A0001234",
    name: "구인주유소",
    brandLabel: "SK에너지",
    lat: 37.5,
    lng: 127.0,
    price: 1834,
    createdAt: "2026-08-09T00:00:00.000Z",
  },
  {
    id: "2",
    userKey: "kakao:1",
    stationUniId: "A0005678",
    name: "영등포제일셀프주유소",
    brandLabel: "HD현대오일뱅크",
    lat: 37.51,
    lng: 127.01,
    price: 1835,
    createdAt: "2026-08-09T00:00:00.000Z",
  },
];

describe("FavoritesList [sso-login S9-1][S9-1][sso-login S9-2][S9-2]", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("[sso-login S9-1][S9-1] shows only the favorited stations from GET /api/favorites", async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve(FAVORITES) });

    render(<FavoritesList />);

    expect(await screen.findByText("구인주유소")).toBeInTheDocument();
    expect(screen.getByText("영등포제일셀프주유소")).toBeInTheDocument();
    expect(screen.getByText("SK에너지 · 1,834원")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/favorites");
  });

  it("[sso-login S9-2][S9-2] shows the empty-state message when there are no favorites", async () => {
    fetchMock.mockResolvedValue({ json: () => Promise.resolve([]) });

    render(<FavoritesList />);

    await waitFor(() => expect(screen.getByText("즐겨찾은 주유소가 없어요")).toBeInTheDocument());
  });
});
