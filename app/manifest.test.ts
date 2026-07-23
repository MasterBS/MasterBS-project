import { describe, expect, it } from "vitest";
import manifest from "./manifest";

describe("manifest [S10]", () => {
  it("[S10] declares standalone display and both icon sizes needed for installability", () => {
    const result = manifest();

    expect(result.display).toBe("standalone");
    expect(result.start_url).toBe("/");
    expect(result.name).toBeTruthy();
    expect(result.short_name).toBeTruthy();

    const sizes = result.icons?.map((icon) => icon.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(result.icons?.every((icon) => icon.type === "image/png")).toBe(true);
  });
});
