import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("loadTmapMaps [tmap]", () => {
  beforeEach(() => {
    vi.resetModules();
    delete window.Tmapv2;
    document.head.innerHTML = "";
  });

  afterEach(() => {
    document.head.innerHTML = "";
  });

  it("[tmap] appends exactly one script tag with the appKey", async () => {
    const { loadTmapMaps } = await import("./tmap-loader");

    const promise = loadTmapMaps("test-app-key");
    const script = document.head.querySelector("script");

    expect(script).not.toBeNull();
    expect(script!.src).toContain("apis.openapi.sk.com/tmap/jsv2");
    expect(script!.src).toContain("appKey=test-app-key");

    // @ts-expect-error - simulating what the real SDK script does on load
    window.Tmapv2 = { Map: class {} };
    script!.onload?.(new Event("load"));

    await expect(promise).resolves.toBe(window.Tmapv2);
  });

  it("[tmap] sets async=false on the script tag so the SDK's internal document.write() is allowed", async () => {
    const { loadTmapMaps } = await import("./tmap-loader");

    loadTmapMaps("test-app-key");
    const script = document.head.querySelector("script");

    expect(script!.async).toBe(false);
  });

  it("[tmap] does not append a second script tag for a concurrent call while loading", async () => {
    const { loadTmapMaps } = await import("./tmap-loader");

    const first = loadTmapMaps("test-app-key");
    const second = loadTmapMaps("test-app-key");

    expect(document.head.querySelectorAll("script")).toHaveLength(1);

    const script = document.head.querySelector("script")!;
    // @ts-expect-error - simulating the real SDK script
    window.Tmapv2 = { Map: class {} };
    script.onload?.(new Event("load"));

    const [firstResult, secondResult] = await Promise.all([first, second]);
    expect(firstResult).toBe(secondResult);
  });

  it("[tmap] resolves without appending a script when Tmapv2 is already loaded", async () => {
    const { loadTmapMaps } = await import("./tmap-loader");

    // @ts-expect-error - simulating an already-loaded SDK
    window.Tmapv2 = { Map: class {} };

    const result = await loadTmapMaps("test-app-key");

    expect(document.head.querySelectorAll("script")).toHaveLength(0);
    expect(result).toBe(window.Tmapv2);
  });

  it("[tmap] rejects and clears the load promise when the script fails to load", async () => {
    const { loadTmapMaps } = await import("./tmap-loader");

    const promise = loadTmapMaps("test-app-key");
    const script = document.head.querySelector("script")!;
    script.onerror?.(new Event("error"));

    await expect(promise).rejects.toThrow();
  });
});
