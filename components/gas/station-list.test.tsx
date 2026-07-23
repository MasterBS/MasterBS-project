import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StationList } from "./station-list";
import type { Station } from "@/types/station";

function makeStation(overrides: Partial<Station> = {}): Station {
  return {
    id: "1",
    name: "테스트주유소",
    brandCode: "SKE",
    brandLabel: "SK에너지",
    price: 1830,
    distance: 850,
    lat: 37.56,
    lng: 127.0,
    isSelfEstimated: false,
    ...overrides,
  };
}

describe("StationList [S1-2]", () => {
  it("[S1-2] renders up to 5 items with rank, name, brand, formatted distance and price", () => {
    const stations = [
      makeStation({ id: "1", name: "1위주유소", price: 1830, distance: 850 }),
      makeStation({ id: "2", name: "2위주유소", price: 1840, distance: 2900 }),
      makeStation({ id: "3", name: "3위주유소", price: 1845, distance: 100 }),
      makeStation({ id: "4", name: "4위주유소", price: 1849, distance: 1000 }),
      makeStation({ id: "5", name: "5위주유소", price: 1900, distance: 1049 }),
    ];

    render(<StationList stations={stations} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(5);

    const first = screen.getByText("1위주유소").closest("li");
    expect(first).not.toBeNull();
    expect(first!.textContent).toContain("1");
    expect(first!.textContent).toContain("SK에너지");
    expect(first!.textContent).toContain("850m");
    expect(first!.textContent).toContain("1,830원");

    // 1km 미만은 "850m", 이상은 소수점 1자리 "km"
    expect(screen.getByText("2위주유소").closest("li")!.textContent).toContain("2.9km");
    expect(screen.getByText("3위주유소").closest("li")!.textContent).toContain("100m");
    expect(screen.getByText("4위주유소").closest("li")!.textContent).toContain("1.0km");
  });

  it("[S1-2] renders fewer than 5 items when fewer stations are given", () => {
    render(<StationList stations={[makeStation()]} />);
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
  });
});
