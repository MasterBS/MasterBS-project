import { describe, expect, it } from "vitest";
import { authConfig } from "./auth";

describe("authConfig callbacks [sso-login] [auth]", () => {
  it("jwt callback derives userKey from provider + providerAccountId on sign-in", async () => {
    const jwt = authConfig.callbacks!.jwt!;
    const token = await jwt({
      token: {},
      account: { provider: "kakao", providerAccountId: "123", type: "oauth", providerType: "oauth" } as never,
      user: {} as never,
    } as never);

    expect(token?.userKey).toBe("kakao:123");
  });

  it("jwt callback keeps the previous userKey on subsequent calls without an account", async () => {
    const jwt = authConfig.callbacks!.jwt!;
    const token = await jwt({
      token: { userKey: "google:999" },
      account: null,
    } as never);

    expect(token?.userKey).toBe("google:999");
  });

  it("jwt callback derives separate userKeys for the same providerAccountId on different providers", async () => {
    const jwt = authConfig.callbacks!.jwt!;
    const kakaoToken = await jwt({
      token: {},
      account: { provider: "kakao", providerAccountId: "999" } as never,
    } as never);
    const googleToken = await jwt({
      token: {},
      account: { provider: "google", providerAccountId: "999" } as never,
    } as never);

    expect(kakaoToken?.userKey).not.toBe(googleToken?.userKey);
  });

  it("session callback copies userKey from the token onto the session", async () => {
    const session = authConfig.callbacks!.session!;
    const result = await session({
      session: { user: {}, expires: "2099-01-01" } as never,
      token: { userKey: "kakao:123" } as never,
    } as never);

    expect((result as { userKey?: string }).userKey).toBe("kakao:123");
  });
});
