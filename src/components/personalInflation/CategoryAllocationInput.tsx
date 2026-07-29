"use client";

import { CPI_GROUPS } from "@/lib/personalInflation/cpiGroups";
import CategoryCard from "@/components/personalInflation/CategoryCard";

export type InputMode = "percent" | "spending";

interface CategoryAllocationInputProps {
  mode: InputMode;
  monthlyBudget: number;
  allocation: Record<number, number>;
  onAllocationChange: (groupNo: number, value: number) => void;
}

export default function CategoryAllocationInput({ mode, monthlyBudget, allocation, onAllocationChange }: CategoryAllocationInputProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CPI_GROUPS.map((g) => (
        <CategoryCard
          key={g.groupNo}
          groupNo={g.groupNo}
          name={g.name}
          color={g.color}
          mode={mode}
          value={allocation[g.groupNo] ?? 0}
          monthlyBudget={monthlyBudget}
          onChange={(value) => onAllocationChange(g.groupNo, value)}
        />
      ))}
    </div>
  );
}
