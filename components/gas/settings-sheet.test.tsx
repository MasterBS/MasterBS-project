import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SettingsSheet } from "./settings-sheet";

describe("SettingsSheet [S1-1][S6]", () => {
  it("[S6] always shows a settings entry point", () => {
    render(<SettingsSheet provider="naver" onProviderChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "설정" })).toBeInTheDocument();
  });

  it("[S6] opens a sheet showing the currently selected provider when the entry point is clicked", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet provider="naver" onProviderChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "설정" }));

    const naverOption = await screen.findByRole("radio", { name: "네이버지도" });
    expect(naverOption).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: "카카오맵" })).toHaveAttribute("aria-checked", "false");
  });

  it("[tmap-provider-integration S5] shows all three provider options including 티맵, with the current selection reflected", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet provider="tmap" onProviderChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "설정" }));

    expect(await screen.findByRole("radio", { name: "카카오맵" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "네이버지도" })).toBeInTheDocument();
    const tmapOption = screen.getByRole("radio", { name: "티맵" });
    expect(tmapOption).toHaveAttribute("aria-checked", "true");
  });

  it("[tmap-provider-integration S5] calls onProviderChange with tmap when the user picks it", async () => {
    const user = userEvent.setup();
    const onProviderChange = vi.fn();
    render(<SettingsSheet provider="naver" onProviderChange={onProviderChange} />);

    await user.click(screen.getByRole("button", { name: "설정" }));
    await user.click(await screen.findByRole("radio", { name: "티맵" }));

    expect(onProviderChange).toHaveBeenCalledWith("tmap");
  });

  it("[S1-1] calls onProviderChange when the user picks a different provider", async () => {
    const user = userEvent.setup();
    const onProviderChange = vi.fn();
    render(<SettingsSheet provider="naver" onProviderChange={onProviderChange} />);

    await user.click(screen.getByRole("button", { name: "설정" }));
    await user.click(await screen.findByRole("radio", { name: "카카오맵" }));

    expect(onProviderChange).toHaveBeenCalledWith("kakao");
  });

  it("[S1-1] closes the sheet after picking a provider", async () => {
    const user = userEvent.setup();
    render(<SettingsSheet provider="naver" onProviderChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "설정" }));
    await user.click(await screen.findByRole("radio", { name: "카카오맵" }));

    await waitFor(() => expect(screen.queryByRole("radio", { name: "카카오맵" })).not.toBeInTheDocument());
  });
});
