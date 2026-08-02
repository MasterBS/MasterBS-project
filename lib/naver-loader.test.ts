import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("loadNaverMaps [naver]", () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.naver;
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("appends exactly one script tag with the ncpKeyId", async () => {
    const { loadNaverMaps } = await import("./naver-loader");

    const promise = loadNaverMaps("test-client-id");
    const script = document.head.querySelector("script");

    expect(script).not.toBeNull();
    expect(script!.src).toContain("ncpKeyId=test-client-id");

    // @ts-expect-error - simulating what the real SDK script does on load
    window.naver = { maps: { Map: class {} } };
    script!.onload?.(new Event("load"));

    await expect(promise).resolves.toBe(window.naver);
  });

  it("[naver] does not append a second script tag for a concurrent call while loading", async () => {
    const { loadNaverMaps } = await import("./naver-loader");

    const first = loadNaverMaps("test-client-id");
    const second = loadNaverMaps("test-client-id");

    expect(document.head.querySelectorAll("script")).toHaveLength(1);

    const script = document.head.querySelector("script")!;
    // @ts-expect-error - simulating the real SDK script
    window.naver = { maps: { Map: class {} } };
    script.onload?.(new Event("load"));

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(secondResult);
  });

  it("[naver] resolves without appending a script when naver.maps is already loaded", async () => {
    const { loadNaverMaps } = await import("./naver-loader");

    // @ts-expect-error - simulating an already-loaded SDK
    window.naver = { maps: { Map: class {} } };

    const result = await loadNaverMaps("test-client-id");

    expect(document.head.querySelectorAll("script")).toHaveLength(0);
    expect(result).toBe(window.naver);
  });

  it("[naver] rejects and clears the load promise when the script fails to load", async () => {
    const { loadNaverMaps } = await import("./naver-loader");

    const promise = loadNaverMaps("test-client-id");
    const script = document.head.querySelector("script")!;
    script.onerror?.(new Event("error"));

    await expect(promise).rejects.toThrow();
  });
});
