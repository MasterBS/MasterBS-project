import { describe, expect, it } from "vitest";
import { buildKakaoRouteUrl } from "./directions";

describe("buildKakaoRouteUrl [S6]", () => {
  it("[S6] builds a kakao map route URL with sp/ep/by query params from WGS84 coordinates", () => {
    const origin = { lat: 37.5587543, lng: 127.0008881 };
    const dest = { lat: 37.577933847449934, lng: 127.02272916490035 };

    const url = buildKakaoRouteUrl(origin, dest);
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe("https://m.map.kakao.com/scheme/route");
    expect(parsed.searchParams.get("sp")).toBe("37.5587543,127.0008881");
    expect(parsed.searchParams.get("ep")).toBe("37.577933847449934,127.02272916490035");
    expect(parsed.searchParams.get("by")).toBe("car");
  });
});
