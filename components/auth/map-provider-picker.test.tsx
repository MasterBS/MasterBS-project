import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MapProviderPicker } from "./map-provider-picker";

describe("MapProviderPicker [sso-login S11][S11][sso-login S12-1][S12-1][sso-login S12-2][S12-2]", () => {
  it("[sso-login S11][S11] renders the 3 map provider options (kakao/naver/tmap)", () => {
    render(<MapProviderPicker onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "카카오맵" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "네이버지도" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "티맵" })).toBeInTheDocument();
  });

  it("[sso-login S12-1][S12-1][sso-login S12-2][S12-2] calls onSelect with the clicked provider", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MapProviderPicker onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "티맵" }));

    expect(onSelect).toHaveBeenCalledWith("tmap");
  });
});
