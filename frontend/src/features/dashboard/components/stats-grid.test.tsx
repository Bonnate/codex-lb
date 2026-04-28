import { render, screen } from "@testing-library/react";
import { Activity, AlertTriangle, Coins, DollarSign } from "lucide-react";
import { describe, expect, it } from "vitest";

import { StatsGrid } from "@/features/dashboard/components/stats-grid";

const EMPTY_TREND: { value: number }[] = [];
const SAMPLE_TREND = [{ value: 1 }, { value: 2 }, { value: 3 }];

describe("StatsGrid", () => {
  it("renders four metric cards with values", () => {
    render(
      <StatsGrid
        stats={[
          { label: "요청 (30일)", value: "228", icon: Activity, trend: SAMPLE_TREND, trendColor: "#3b82f6" },
          { label: "토큰 (30일)", value: "45K", icon: Coins, trend: SAMPLE_TREND, trendColor: "#8b5cf6" },
          { label: "비용 (30일)", value: "$1.82", meta: "일당 평균 $0.06", icon: DollarSign, trend: SAMPLE_TREND, trendColor: "#10b981" },
          { label: "오류율 (30일)", value: "2.8%", meta: "가장 많음: rate_limit_exceeded", icon: AlertTriangle, trend: SAMPLE_TREND, trendColor: "#f59e0b" },
        ]}
      />,
    );

    expect(screen.getByText("요청 (30일)")).toBeInTheDocument();
    expect(screen.getByText("228")).toBeInTheDocument();
    expect(screen.getByText("토큰 (30일)")).toBeInTheDocument();
    expect(screen.getByText("45K")).toBeInTheDocument();
    expect(screen.getByText("비용 (30일)")).toBeInTheDocument();
    expect(screen.getByText("일당 평균 $0.06")).toBeInTheDocument();
    expect(screen.getByText("오류율 (30일)")).toBeInTheDocument();
    expect(screen.getByText("가장 많음: rate_limit_exceeded")).toBeInTheDocument();
  });

  it("renders without sparklines when trend is empty", () => {
    render(
      <StatsGrid
        stats={[
          { label: "Empty", value: "0", icon: Activity, trend: EMPTY_TREND, trendColor: "#3b82f6" },
        ]}
      />,
    );

    expect(screen.getByText("Empty")).toBeInTheDocument();
  });
});
