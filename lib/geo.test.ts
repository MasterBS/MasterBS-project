import { describe, expect, it } from "vitest";
import { katecToWgs84, wgs84ToKatec } from "./geo";

describe("geo [geo]", () => {
  it("converts a known KATEC pair to the expected WGS84 coordinate (서울 중구권)", () => {
    const { lng, lat } = katecToWgs84(311923, 551192);
    expect(lng).toBeCloseTo(127.0008881, 5);
    expect(lat).toBeCloseTo(37.5587543, 5);
  });

  it("round-trips WGS84 -> KATEC -> WGS84 within 1m", () => {
    const original = { lng: 127.0008881, lat: 37.5587543 };
    const katec = wgs84ToKatec(original.lng, original.lat);
    const back = katecToWgs84(katec.x, katec.y);

    // 위도 1도 ≈ 111,320m, 경도 1도(위도 37.5°) ≈ 88,300m 이므로
    // 오차 1m는 위경도 약 0.000009도에 해당한다.
    expect(Math.abs(back.lng - original.lng)).toBeLessThan(0.000009);
    expect(Math.abs(back.lat - original.lat)).toBeLessThan(0.000009);
  });

  it("round-trips a known KATEC pair -> WGS84 -> KATEC within 1m", () => {
    const original = { x: 311923, y: 551192 };
    const wgs84 = katecToWgs84(original.x, original.y);
    const back = wgs84ToKatec(wgs84.lng, wgs84.lat);

    expect(Math.abs(back.x - original.x)).toBeLessThan(1);
    expect(Math.abs(back.y - original.y)).toBeLessThan(1);
  });
});
