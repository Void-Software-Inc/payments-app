"use client";

import { WithdrawForm } from "./components/WithdrawForm";
import { BalanceDisplay } from "./components/BalanceDisplay";
import { HeaderNav } from "./components/HeaderNav";
import { ArrowDown } from "lucide-react";

export default function WithdrawPage() {
  return (
   
    <div className="container mx-auto w-full flex justify-center 8">
        <div className="w-[90%] h-full">
            <HeaderNav />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-20 pb-10">
            {/* Balance card on the left */}
                <div className="col-span-1">
                    <BalanceDisplay />
                </div>
                <div className="w-full h-fit flex justify-center text-[#7AC0E0]">
                    <ArrowDown className="size-6" />
                </div>
                {/* Withdraw form on the right */}
                <div className="col-span-1 md:col-span-2">
                <WithdrawForm />
                </div>
            </div>
        </div>
    </div>
  );
} 