import { describe, expect, it, vi } from "vitest";

function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.order = vi.fn(chain);
  builder.insert = vi.fn(chain);
  builder.delete = vi.fn(chain);
  builder.single = vi.fn(() => Promise.resolve(result));
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.then = (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve);
  return builder;
}

const fromMock = vi.fn();
vi.mock("@/lib/supabase", () => ({
  getSupabaseClient: () => ({ from: (...args: unknown[]) => fromMock(...args) }),
}));

const { listFavorites, toggleFavorite } = await import("./favorites");

const SNAPSHOT = {
  stationUniId: "A0001234",
  name: "구인주유소",
  brandLabel: "SK에너지",
  lat: 37.5,
  lng: 127.0,
  price: 1834,
};

describe("favorites service [sso-login] [favorites]", () => {
  it("listFavorites maps rows to camelCase, newest first", async () => {
    fromMock.mockReturnValue(
      makeQueryBuilder({
        data: [
          {
            id: "1",
            user_key: "kakao:123",
            station_uni_id: "A0001234",
            name: "구인주유소",
            brand_label: "SK에너지",
            lat: 37.5,
            lng: 127.0,
            price: 1834,
            created_at: "2026-08-09T00:00:00.000Z",
          },
        ],
        error: null,
      }),
    );

    const result = await listFavorites("kakao:123");

    expect(result).toEqual([
      {
        id: "1",
        userKey: "kakao:123",
        stationUniId: "A0001234",
        name: "구인주유소",
        brandLabel: "SK에너지",
        lat: 37.5,
        lng: 127.0,
        price: 1834,
        createdAt: "2026-08-09T00:00:00.000Z",
      },
    ]);
  });

  it("listFavorites returns [] when there are no rows", async () => {
    fromMock.mockReturnValue(makeQueryBuilder({ data: [], error: null }));

    const result = await listFavorites("kakao:123");

    expect(result).toEqual([]);
  });

  it("listFavorites throws when Supabase returns an error", async () => {
    fromMock.mockReturnValue(makeQueryBuilder({ data: null, error: { message: "boom" } }));

    await expect(listFavorites("kakao:123")).rejects.toThrow("boom");
  });

  it("toggleFavorite inserts a snapshot row when not yet favorited", async () => {
    const selectBuilder = makeQueryBuilder({ data: null, error: null });
    const insertBuilder = makeQueryBuilder({ data: null, error: null });
    fromMock.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(insertBuilder);

    const result = await toggleFavorite("kakao:123", SNAPSHOT);

    expect(result).toEqual({ favorited: true });
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_key: "kakao:123",
        station_uni_id: "A0001234",
        name: "구인주유소",
        brand_label: "SK에너지",
        price: 1834,
      }),
    );
  });

  it("toggleFavorite deletes the row when already favorited", async () => {
    const selectBuilder = makeQueryBuilder({ data: { id: "existing-id" }, error: null });
    const deleteBuilder = makeQueryBuilder({ data: null, error: null });
    fromMock.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(deleteBuilder);

    const result = await toggleFavorite("kakao:123", SNAPSHOT);

    expect(result).toEqual({ favorited: false });
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith("id", "existing-id");
  });

  it("toggleFavorite throws when the insert fails", async () => {
    const selectBuilder = makeQueryBuilder({ data: null, error: null });
    const insertBuilder = makeQueryBuilder({ data: null, error: { message: "boom" } });
    fromMock.mockReturnValueOnce(selectBuilder).mockReturnValueOnce(insertBuilder);

    await expect(toggleFavorite("kakao:123", SNAPSHOT)).rejects.toThrow("boom");
  });
});
