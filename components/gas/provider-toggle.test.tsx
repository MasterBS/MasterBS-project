import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderToggle } from "./provider-toggle";

describe("ProviderToggle [provider-toggle]", () => {
  it("[provider-toggle] renders both provider options with the current value checked", () => {
    render(<ProviderToggle value="kakao" onChange={vi.fn()} />);

    expect(screen.getByRole("radio", { name: "카카오맵" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "네이버지도" })).toHaveAttribute("aria-checked", "false");
  });

  it("[provider-toggle] calls onChange with the newly selected provider", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProviderToggle value="kakao" onChange={onChange} />);

    await user.click(screen.getByRole("radio", { name: "네이버지도" }));

    expect(onChange).toHaveBeenCalledWith("naver");
  });
});
