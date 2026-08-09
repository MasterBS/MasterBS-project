import { describe, expect, it, vi } from "vitest";

// Supabase의 PostgrestFilterBuilder는 체이닝 가능하면서 그 자체로 thenable(Promise)이다.
// 인터페이스만 맞춘 fake로 대체한다 (실 Supabase 클라이언트는 쓰지 않음).
function makeQueryBuilder(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {};
  const chain = () => builder;
  builder.select = vi.fn(chain);
  builder.eq = vi.fn(chain);
  builder.upsert = vi.fn(chain);
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

const { getUserSettings, upsertUserSettings } = await import("./user-settings");

describe("user-settings service [sso-login] [user-settings]", () => {
  it("getUserSettings returns null when no row exists", async () => {
    fromMock.mockReturnValue(makeQueryBuilder({ data: null, error: null }));

    const result = await getUserSettings("kakao:123");

    expect(result).toBeNull();
    expect(fromMock).toHaveBeenCalledWith("user_settings");
  });

  it("getUserSettings maps the row to camelCase fields", async () => {
    fromMock.mockReturnValue(
      makeQueryBuilder({
        data: {
          user_key: "kakao:123",
          fuel_type: "gasoline",
          brands: ["SKE", "GSC"],
          map_provider: "naver",
          updated_at: "2026-08-09T00:00:00.000Z",
        },
        error: null,
      }),
    );

    const result = await getUserSettings("kakao:123");

    expect(result).toEqual({
      userKey: "kakao:123",
      fuelType: "gasoline",
      brands: ["SKE", "GSC"],
      mapProvider: "naver",
      updatedAt: "2026-08-09T00:00:00.000Z",
    });
  });

  it("getUserSettings throws when Supabase returns an error", async () => {
    fromMock.mockReturnValue(makeQueryBuilder({ data: null, error: { message: "boom" } }));

    await expect(getUserSettings("kakao:123")).rejects.toThrow("boom");
  });

  it("upsertUserSettings only sends the provided partial fields (mapProvider alone)", async () => {
    const builder = makeQueryBuilder({
      data: {
        user_key: "kakao:123",
        fuel_type: "gasoline",
        brands: ["SKE", "GSC", "HDO", "SOL", "ETC"],
        map_provider: "naver",
        updated_at: "2026-08-09T00:00:00.000Z",
      },
      error: null,
    });
    fromMock.mockReturnValue(builder);

    const result = await upsertUserSettings("kakao:123", { mapProvider: "naver" });

    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_key: "kakao:123", map_provider: "naver" }),
      { onConflict: "user_key" },
    );
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.not.objectContaining({ fuel_type: expect.anything() }),
      expect.anything(),
    );
    expect(result.mapProvider).toBe("naver");
  });

  it("upsertUserSettings throws when Supabase returns an error", async () => {
    fromMock.mockReturnValue(makeQueryBuilder({ data: null, error: { message: "boom" } }));

    await expect(upsertUserSettings("kakao:123", { fuelType: "diesel" })).rejects.toThrow("boom");
  });
});
