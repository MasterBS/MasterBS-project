import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FavoriteButton } from "./favorite-button";
import type { Station } from "@/types/station";

const STATION: Station = {
  id: "A0001234",
  name: "구인주유소",
  brandCode: "SKE",
  brandLabel: "SK에너지",
  price: 1834,
  distance: 2600,
  lat: 37.5,
  lng: 127.0,
  isSelfEstimated: false,
};

const fetchMock = vi.fn();

describe("FavoriteButton [sso-login S7-1][S7-1][sso-login S7-2][S7-2]", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts unfilled (aria-pressed=false)", () => {
    render(<FavoriteButton station={STATION} />);

    expect(screen.getByRole("button", { name: "즐겨찾기" })).toHaveAttribute("aria-pressed", "false");
  });

  it("[sso-login S7-1][S7-1] fills the heart and POSTs the station snapshot when clicked", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({ ok: true, json: () => Promise.resolve({ favorited: true }) });

    render(<FavoriteButton station={STATION} />);
    await user.click(screen.getByRole("button", { name: "즐겨찾기" }));

    expect(screen.getByRole("button", { name: "즐겨찾기" })).toHaveAttribute("aria-pressed", "true");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/favorites",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          stationUniId: "A0001234",
          name: "구인주유소",
          brandLabel: "SK에너지",
          lat: 37.5,
          lng: 127.0,
          price: 1834,
        }),
      }),
    );
  });

  it("[sso-login S7-2][S7-2] clicking again unfills the heart (toggles back off)", async () => {
    const user = userEvent.setup();
    fetchMock
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ favorited: true }) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ favorited: false }) });

    render(<FavoriteButton station={STATION} />);
    const button = screen.getByRole("button", { name: "즐겨찾기" });

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "true");

    await user.click(button);
    expect(button).toHaveAttribute("aria-pressed", "false");
  });

  it("reverts the optimistic update if the save request fails", async () => {
    const user = userEvent.setup();
    fetchMock.mockResolvedValue({ ok: false, json: () => Promise.resolve({}) });

    render(<FavoriteButton station={STATION} />);
    const button = screen.getByRole("button", { name: "즐겨찾기" });

    await user.click(button);

    expect(button).toHaveAttribute("aria-pressed", "false");
  });
});
