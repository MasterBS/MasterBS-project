import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const signInMock = vi.fn();
vi.mock("next-auth/react", () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

const { LoginGate } = await import("./login-gate");

describe("LoginGate [sso-login S10][S10]", () => {
  it("[sso-login S10][S10] renders exactly the 3 supported providers (Kakao/Naver/Google, no Apple)", () => {
    render(<LoginGate />);

    expect(screen.getByRole("button", { name: "카카오로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "네이버로 로그인" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "구글로 로그인" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apple/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("[sso-login S3][S3] calls signIn with the clicked provider's id", async () => {
    const user = userEvent.setup();
    render(<LoginGate />);

    await user.click(screen.getByRole("button", { name: "카카오로 로그인" }));
    expect(signInMock).toHaveBeenCalledWith("kakao");

    await user.click(screen.getByRole("button", { name: "네이버로 로그인" }));
    expect(signInMock).toHaveBeenCalledWith("naver");

    await user.click(screen.getByRole("button", { name: "구글로 로그인" }));
    expect(signInMock).toHaveBeenCalledWith("google");
  });
});
