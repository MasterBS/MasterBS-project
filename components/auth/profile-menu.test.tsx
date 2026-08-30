import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signOutMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

const { ProfileMenu } = await import("./profile-menu");

describe("ProfileMenu [sso-login S14][S14]", () => {
  it("[sso-login S14][S14] calls next-auth's signOut when 로그아웃 is clicked", async () => {
    const user = userEvent.setup();
    render(<ProfileMenu />);

    await user.click(screen.getByRole("button", { name: "프로필" }));
    await user.click(await screen.findByText("로그아웃"));

    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  it("[sso-login S9-1][S9-1] does not show a favorites entry point when onOpenFavorites is not passed", async () => {
    const user = userEvent.setup();
    render(<ProfileMenu />);

    await user.click(screen.getByRole("button", { name: "프로필" }));

    expect(screen.queryByText("즐겨찾기 목록")).not.toBeInTheDocument();
  });

  it("[sso-login S9-1][S9-1] calls onOpenFavorites when 즐겨찾기 목록 is clicked", async () => {
    const user = userEvent.setup();
    const onOpenFavorites = vi.fn();
    render(<ProfileMenu onOpenFavorites={onOpenFavorites} />);

    await user.click(screen.getByRole("button", { name: "프로필" }));
    await user.click(await screen.findByText("즐겨찾기 목록"));

    expect(onOpenFavorites).toHaveBeenCalledTimes(1);
  });
});
