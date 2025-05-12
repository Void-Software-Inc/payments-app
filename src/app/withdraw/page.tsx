"use client";

import { WithdrawForm } from "./components/WithdrawForm";
import { BalanceDisplay } from "./components/BalanceDisplay";
import { HeaderNav } from "./components/HeaderNav";

export default function WithdrawPage() {
  return (
    <div className="container mx-auto py-10 space-y-8">
      <HeaderNav />
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Balance card on the left */}
        <div className="col-span-1">
          <BalanceDisplay />
        </div>
        
        {/* Withdraw form on the right */}
        <div className="col-span-1 md:col-span-2">
          <WithdrawForm />
        </div>
      </div>
    </div>
  );
} 