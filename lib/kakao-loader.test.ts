import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("loadKakaoMaps [kakao]", () => {
  beforeEach(() => {
    vi.resetModules();
    // @ts-expect-error - test cleanup of a global the SDK script normally sets
    delete window.kakao;
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("appends exactly one script tag with the appkey and autoload=false", async () => {
    const { loadKakaoMaps } = await import("./kakao-loader");

    const promise = loadKakaoMaps("test-key");
    const script = document.head.querySelector("script");

    expect(script).not.toBeNull();
    expect(script!.src).toContain("appkey=test-key");
    expect(script!.src).toContain("autoload=false");

    // @ts-expect-error - simulating what the real SDK script does on load
    window.kakao = { maps: { load: (cb: () => void) => cb() } };
    script!.onload?.(new Event("load"));

    await expect(promise).resolves.toBe(window.kakao);
  });

  it("[kakao] does not append a second script tag for a concurrent call while loading", async () => {
    const { loadKakaoMaps } = await import("./kakao-loader");

    const first = loadKakaoMaps("test-key");
    const second = loadKakaoMaps("test-key");

    expect(document.head.querySelectorAll("script")).toHaveLength(1);

    const script = document.head.querySelector("script")!;
    // @ts-expect-error - simulating the real SDK script
    window.kakao = { maps: { load: (cb: () => void) => cb() } };
    script.onload?.(new Event("load"));

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(secondResult);
  });

  it("[kakao] resolves without appending a script when kakao.maps is already loaded", async () => {
    const { loadKakaoMaps } = await import("./kakao-loader");

    // @ts-expect-error - simulating an already-loaded SDK
    window.kakao = { maps: { load: (cb: () => void) => cb(), Map: class {} } };

    const result = await loadKakaoMaps("test-key");

    expect(document.head.querySelectorAll("script")).toHaveLength(0);
    expect(result).toBe(window.kakao);
  });
});
