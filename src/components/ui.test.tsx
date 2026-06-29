import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Button, ProgressBar, StatusBadge } from "./ui";
import { apiError } from "@/api/client";

describe("StatusBadge", () => {
  it("renders the status text", () => {
    render(<StatusBadge status="generated" />);
    expect(screen.getByText("generated")).toBeInTheDocument();
  });
});

describe("Button", () => {
  it("fires onClick when enabled and not when disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button onClick={onClick}>Go</Button>);
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    fireEvent.click(screen.getByText("Go"));
    expect(onClick).toHaveBeenCalledTimes(1); // unchanged
  });
});

describe("ProgressBar", () => {
  it("clamps width from the fraction", () => {
    const { container } = render(<ProgressBar value={0.5} />);
    const bar = container.querySelector("[style]") as HTMLElement;
    expect(bar.style.width).toBe("50%");
  });
});

describe("apiError", () => {
  it("falls back to the Error message for non-axios errors", () => {
    expect(apiError(new Error("boom"))).toBe("boom");
    expect(apiError("weird")).toBe("Unexpected error");
  });
});
