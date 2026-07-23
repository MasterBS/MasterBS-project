import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Filters } from "./filters";
import type { BrandKey } from "@/types/station";

const ALL_BRANDS: BrandKey[] = ["SKE", "GSC", "HDO", "SOL", "ETC"];

describe("Filters [S3][S4-1][S4-2]", () => {
  it("[S3] unchecking a brand calls onBrandsChange with that brand removed", async () => {
    const user = userEvent.setup();
    const onBrandsChange = vi.fn();

    render(
      <Filters
        brands={ALL_BRANDS}
        onBrandsChange={onBrandsChange}
        selfOnly={false}
        onSelfOnlyChange={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("GS칼텍스"));

    expect(onBrandsChange).toHaveBeenCalledWith(["SKE", "HDO", "SOL", "ETC"]);
  });

  it("[S3] re-checking a brand calls onBrandsChange with that brand added back", async () => {
    const user = userEvent.setup();
    const onBrandsChange = vi.fn();
    const withoutGsc: BrandKey[] = ["SKE", "HDO", "SOL", "ETC"];

    render(
      <Filters
        brands={withoutGsc}
        onBrandsChange={onBrandsChange}
        selfOnly={false}
        onSelfOnlyChange={vi.fn()}
      />,
    );

    await user.click(screen.getByLabelText("GS칼텍스"));

    expect(onBrandsChange).toHaveBeenCalledWith(["SKE", "HDO", "SOL", "ETC", "GSC"]);
  });

  it("[S4-1] turning the self-service switch on calls onSelfOnlyChange(true)", async () => {
    const user = userEvent.setup();
    const onSelfOnlyChange = vi.fn();

    render(
      <Filters
        brands={ALL_BRANDS}
        onBrandsChange={vi.fn()}
        selfOnly={false}
        onSelfOnlyChange={onSelfOnlyChange}
      />,
    );

    await user.click(screen.getByLabelText("셀프주유소만 보기"));

    expect(onSelfOnlyChange).toHaveBeenCalledWith(true);
  });

  it("[S4-2] always shows the self-service estimate caption below the toggle", () => {
    render(
      <Filters
        brands={ALL_BRANDS}
        onBrandsChange={vi.fn()}
        selfOnly={false}
        onSelfOnlyChange={vi.fn()}
      />,
    );

    expect(screen.getByText("이름 기준 추정치이며 정확하지 않을 수 있어요")).toBeInTheDocument();
  });

  it("[S4-2] keeps showing the caption when selfOnly is already on", () => {
    render(
      <Filters
        brands={ALL_BRANDS}
        onBrandsChange={vi.fn()}
        selfOnly={true}
        onSelfOnlyChange={vi.fn()}
      />,
    );

    expect(screen.getByText("이름 기준 추정치이며 정확하지 않을 수 있어요")).toBeInTheDocument();
  });
});
