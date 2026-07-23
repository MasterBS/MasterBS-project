import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { ServiceWorkerRegister } from "./service-worker-register";

describe("ServiceWorkerRegister [S10]", () => {
  afterEach(() => {
    // @ts-expect-error - test cleanup of a global normally provided by the browser
    delete navigator.serviceWorker;
  });

  it("[S10] registers /sw.js when serviceWorker is supported", () => {
    const register = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: { register },
      configurable: true,
    });

    render(<ServiceWorkerRegister />);

    expect(register).toHaveBeenCalledWith("/sw.js");
  });
});
