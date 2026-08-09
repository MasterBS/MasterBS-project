import { describe, expect, it } from "vitest";
import { deriveUserKey } from "./user-key";

describe("deriveUserKey [sso-login] [user-key]", () => {
  it("joins provider and providerAccountId with a colon", () => {
    expect(deriveUserKey("kakao", "12345")).toBe("kakao:12345");
  });

  it("keeps kakao and google accounts with the same account id separate", () => {
    expect(deriveUserKey("kakao", "999")).not.toBe(deriveUserKey("google", "999"));
  });
});
