"use client";

import { ActionButtonsCustomer } from "@/components/ActionButtonsCustomer";
import { WithdrawForm } from "./components/WithdrawForm";

export default function WithdrawPage() {
  return (
    <div className="container mx-auto w-dvw h-dvh max-w-md py-5 px-4">
      <div className="w-full h-full">
        <div className="flex items-center mb-6">
          <h1 className="text-2xl font-semibold text-white mx-auto">Withdraw</h1>
        </div>
        <WithdrawForm />
      </div>
      <ActionButtonsCustomer />
    </div>
  );
} 