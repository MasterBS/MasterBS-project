import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildKakaoRouteUrl,
  buildNaverRouteUrl,
  buildNaverWebFallbackUrl,
  buildRouteUrl,
  buildTmapRouteUrl,
  openRoute,
} from "./directions";

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

  it("[tmap-provider-integration S2] dispatches to the tmap builder when provider is tmap", () => {
    const url = buildRouteUrl("tmap", origin, dest, "테스트주유소");
    expect(url).toBe(buildTmapRouteUrl(origin, dest, "테스트주유소"));
  });
});

describe("buildTmapRouteUrl [tmap-provider-integration S2]", () => {
  it("[tmap-provider-integration S2] builds a tmap:// route URL with goalx/goaly/goalname from WGS84 coordinates", () => {
    const origin = { lat: 37.5587543, lng: 127.0008881 };
    const dest = { lat: 37.577933847449934, lng: 127.02272916490035 };

    const url = buildTmapRouteUrl(origin, dest, "테스트주유소");
    const parsed = new URL(url);

    expect(parsed.protocol + "//" + parsed.host + parsed.pathname).toBe("tmap://route");
    expect(parsed.searchParams.get("goalx")).toBe("127.02272916490035");
    expect(parsed.searchParams.get("goaly")).toBe("37.577933847449934");
    expect(parsed.searchParams.get("goalname")).toBe("테스트주유소");
  });

  it("[tmap-provider-integration S2] falls back to a default destination name when none is given", () => {
    const origin = { lat: 37.5587543, lng: 127.0008881 };
    const dest = { lat: 37.6, lng: 127.1 };

    const url = buildTmapRouteUrl(origin, dest);
    const parsed = new URL(url);

    expect(parsed.searchParams.get("goalname")).toBeTruthy();
  });
});

describe("buildNaverWebFallbackUrl", () => {
  it("builds a map.naver.com/p/directions web URL with lng,lat,name path segments", () => {
    const origin = { lat: 37.5587543, lng: 127.0008881 };
    const dest = { lat: 37.6, lng: 127.1 };

    const url = buildNaverWebFallbackUrl(origin, dest, "테스트주유소");
    const parsed = new URL(url);

    expect(parsed.origin + parsed.pathname).toBe(
      `https://map.naver.com/p/directions/127.0008881,37.5587543,${encodeURIComponent("현재 위치")},/127.1,37.6,${encodeURIComponent("테스트주유소")},/-/car`,
    );
  });
});

describe("openRoute [네이버지도 길찾기 앱 딥링크 폴백]", () => {
  const origin = { lat: 37.5587543, lng: 127.0008881 };
  const dest = { lat: 37.6, lng: 127.1 };

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("kakao: opens the kakao route URL once and schedules no fallback", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    openRoute("kakao", origin, dest, "테스트주유소");

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(buildKakaoRouteUrl(origin, dest), "_blank");
    vi.advanceTimersByTime(5000);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("[tmap-provider-integration S2][tmap-provider-integration INV-2] tmap: opens the tmap route URL once and schedules no web-fallback timer", () => {
    const openSpy = vi.spyOn(window, "open").mockReturnValue(null);

    openRoute("tmap", origin, dest, "테스트주유소");

    expect(openSpy).toHaveBeenCalledTimes(1);
    expect(openSpy).toHaveBeenCalledWith(buildTmapRouteUrl(origin, dest, "테스트주유소"), "_blank");
    vi.advanceTimersByTime(5000);
    expect(openSpy).toHaveBeenCalledTimes(1);
  });

  it("naver: opens the nmap:// deep link immediately, then redirects the same tab to the web fallback if it's still open", () => {
    const popup = { closed: false, location: { href: "" } } as unknown as Window;
    const openSpy = vi.spyOn(window, "open").mockReturnValue(popup);

    openRoute("naver", origin, dest, "테스트주유소");

    expect(openSpy).toHaveBeenCalledWith(buildNaverRouteUrl(origin, dest, "테스트주유소"), "_blank");
    expect(popup.location.href).toBe("");

    vi.advanceTimersByTime(1200);

    expect(popup.location.href).toBe(buildNaverWebFallbackUrl(origin, dest, "테스트주유소"));
  });

  it("naver: does not redirect if the deep link tab was already closed (app likely took over)", () => {
    const popup = { closed: true, location: { href: "" } } as unknown as Window;
    vi.spyOn(window, "open").mockReturnValue(popup);

    openRoute("naver", origin, dest, "테스트주유소");
    vi.advanceTimersByTime(5000);

    expect(popup.location.href).toBe("");
  });

  it("naver: does nothing further if window.open was blocked (returns null)", () => {
    vi.spyOn(window, "open").mockReturnValue(null);

    expect(() => {
      openRoute("naver", origin, dest, "테스트주유소");
      vi.advanceTimersByTime(5000);
    }).not.toThrow();
  });
});
