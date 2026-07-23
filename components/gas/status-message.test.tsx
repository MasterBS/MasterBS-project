import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  ApiErrorMessage,
  EmptyResultsMessage,
  LocationDeniedMessage,
  PartialResultsBanner,
} from "./status-message";

describe("status-message [S7-2][S8][S9]", () => {
  it("[S7-2] shows '10km 내 N곳만 찾았어요' for a partial result count", () => {
    render(<PartialResultsBanner count={2} />);
    expect(screen.getByText("10km 내 2곳만 찾았어요")).toBeInTheDocument();
  });

  it("[S7-2] shows '10km 내에 조건에 맞는 주유소가 없어요' when there are 0 results", () => {
    render(<EmptyResultsMessage />);
    expect(screen.getByText("10km 내에 조건에 맞는 주유소가 없어요")).toBeInTheDocument();
  });

  it("[S8] shows the location-denied message with a 다시 시도 button that calls onRetry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<LocationDeniedMessage onRetry={onRetry} />);

    expect(screen.getByText("위치 권한이 필요해요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("[S9] shows the API-error message with a 다시 시도 button that calls onRetry", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<ApiErrorMessage onRetry={onRetry} />);

    expect(screen.getByText("가격 정보를 불러오지 못했어요")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
