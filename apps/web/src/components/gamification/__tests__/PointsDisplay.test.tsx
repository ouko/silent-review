import { render, screen } from "@testing-library/react";
import { PointsDisplay } from "../PointsDisplay";

describe("PointsDisplay", () => {
  it("renders formatted points", () => {
    render(<PointsDisplay points={1234} />);
    expect(screen.getByText("1,234")).toBeInTheDocument();
  });
});
