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
});
