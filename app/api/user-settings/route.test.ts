import { afterEach, describe, expect, it, vi } from "vitest";
import type { UserSettings } from "@/types/user-settings";

const authMock = vi.fn();
const getUserSettingsMock = vi.fn();
const upsertUserSettingsMock = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: (...args: unknown[]) => authMock(...args) }));
vi.mock("@/services/user-settings", () => ({
  getUserSettings: (...args: unknown[]) => getUserSettingsMock(...args),
  upsertUserSettings: (...args: unknown[]) => upsertUserSettingsMock(...args),
}));

const { GET, PUT } = await import("./route");

const SETTINGS: UserSettings = {
  userKey: "kakao:123",
  fuelType: "gasoline",
  brands: ["SKE", "GSC", "HDO", "SOL", "ETC"],
  mapProvider: "naver",
  updatedAt: "2026-08-09T00:00:00.000Z",
};

describe("GET/PUT /api/user-settings [sso-login] [user-settings-route]", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns 401 when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const res = await GET();

    expect(res.status).toBe(401);
    expect(getUserSettingsMock).not.toHaveBeenCalled();
  });

  it("GET returns 401 when the session has no userKey", async () => {
    authMock.mockResolvedValue({ user: {} });

    const res = await GET();

    expect(res.status).toBe(401);
  });

  it("GET returns the current session's settings", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });
    getUserSettingsMock.mockResolvedValue(SETTINGS);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(SETTINGS);
    expect(getUserSettingsMock).toHaveBeenCalledWith("kakao:123");
  });

  it("GET returns null when the account has no settings yet", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });
    getUserSettingsMock.mockResolvedValue(null);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toBeNull();
  });

  it("PUT returns 401 when there is no session", async () => {
    authMock.mockResolvedValue(null);

    const res = await PUT(new Request("http://localhost/api/user-settings", { method: "PUT", body: "{}" }));

    expect(res.status).toBe(401);
    expect(upsertUserSettingsMock).not.toHaveBeenCalled();
  });

  it("PUT upserts settings for the session's userKey with the request body", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });
    upsertUserSettingsMock.mockResolvedValue(SETTINGS);

    const res = await PUT(
      new Request("http://localhost/api/user-settings", {
        method: "PUT",
        body: JSON.stringify({ mapProvider: "naver" }),
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual(SETTINGS);
    expect(upsertUserSettingsMock).toHaveBeenCalledWith("kakao:123", { mapProvider: "naver" });
  });

  it("PUT returns 400 and does not upsert when mapProvider is not a known provider", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });

    const res = await PUT(
      new Request("http://localhost/api/user-settings", {
        method: "PUT",
        body: JSON.stringify({ mapProvider: "bing" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(upsertUserSettingsMock).not.toHaveBeenCalled();
  });

  it("PUT returns 400 and does not upsert when fuelType is unknown", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });

    const res = await PUT(
      new Request("http://localhost/api/user-settings", {
        method: "PUT",
        body: JSON.stringify({ fuelType: "hydrogen" }),
      }),
    );

    expect(res.status).toBe(400);
    expect(upsertUserSettingsMock).not.toHaveBeenCalled();
  });

  it("PUT returns 400 and does not upsert when brands contains an unknown value", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });

    const res = await PUT(
      new Request("http://localhost/api/user-settings", {
        method: "PUT",
        body: JSON.stringify({ brands: ["SKE", "NOT_A_BRAND"] }),
      }),
    );

    expect(res.status).toBe(400);
    expect(upsertUserSettingsMock).not.toHaveBeenCalled();
  });

  it("PUT accepts mapProvider: null", async () => {
    authMock.mockResolvedValue({ userKey: "kakao:123" });
    upsertUserSettingsMock.mockResolvedValue({ ...SETTINGS, mapProvider: null });

    const res = await PUT(
      new Request("http://localhost/api/user-settings", {
        method: "PUT",
        body: JSON.stringify({ mapProvider: null }),
      }),
    );

    expect(res.status).toBe(200);
    expect(upsertUserSettingsMock).toHaveBeenCalledWith("kakao:123", { mapProvider: null });
  });
});
