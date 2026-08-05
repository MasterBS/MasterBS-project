import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProviderSelect } from "./provider-select";

describe("ProviderSelect [S1-2][S2-1]", () => {
  it("[S1-2] renders only the two provider buttons", () => {
    render(<ProviderSelect onSelect={vi.fn()} />);

    expect(screen.getByRole("button", { name: "카카오맵" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "네이버지도" })).toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });

  it("[S2-1] calls onSelect with the clicked provider", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ProviderSelect onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "네이버지도" }));

    expect(onSelect).toHaveBeenCalledWith("naver");
  });
});
