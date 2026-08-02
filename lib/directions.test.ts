import { describe, expect, it } from "vitest";
import { buildKakaoRouteUrl, buildNaverRouteUrl, buildRouteUrl } from "./directions";

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

describe("buildNaverRouteUrl [S2]", () => {
  it("[S2] builds a naver map nmap:// route URL with slat/slng/dlat/dlng/appname", () => {
    const origin = { lat: 37.5587543, lng: 127.0008881 };
    const dest = { lat: 37.577933847449934, lng: 127.02272916490035 };

    const url = buildNaverRouteUrl(origin, dest, "테스트주유소");
    const parsed = new URL(url);

    expect(parsed.protocol + "//" + parsed.host + parsed.pathname).toBe("nmap://route/car");
    expect(parsed.searchParams.get("slat")).toBe("37.5587543");
    expect(parsed.searchParams.get("slng")).toBe("127.0008881");
    expect(parsed.searchParams.get("dlat")).toBe("37.577933847449934");
    expect(parsed.searchParams.get("dlng")).toBe("127.02272916490035");
    expect(parsed.searchParams.get("dname")).toBe("테스트주유소");
    expect(parsed.searchParams.get("appname")).toBeTruthy();
  });
});

describe("buildRouteUrl [S2]", () => {
  const origin = { lat: 37.5587543, lng: 127.0008881 };
  const dest = { lat: 37.6, lng: 127.1 };

  it("[S2] dispatches to the kakao builder when provider is kakao", () => {
    const url = buildRouteUrl("kakao", origin, dest, "테스트주유소");
    expect(url).toBe(buildKakaoRouteUrl(origin, dest));
  });

  it("[S2] dispatches to the naver builder when provider is naver", () => {
    const url = buildRouteUrl("naver", origin, dest, "테스트주유소");
    expect(url).toBe(buildNaverRouteUrl(origin, dest, "테스트주유소"));
  });
});
