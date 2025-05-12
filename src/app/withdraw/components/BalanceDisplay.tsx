"use client";

import { BalanceCard } from "@/components/BalanceCard";

export function BalanceDisplay() {
  return (
    <BalanceCard 
      title="Available Balance"
      disableActions={true}
    />
  );
} 