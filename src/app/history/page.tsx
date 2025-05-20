"use client"

import { useCurrentAccount } from "@mysten/dapp-kit"
import { AllUserCompletedPayments } from "./components/AllUserCompletedPayments"

export default function HistoryPage() {
  const currentAccount = useCurrentAccount()

  // If not connected, show nothing 
  if (!currentAccount?.address) {
    return null;
  }

  return (
    <div className="h-dvh w-dvw overflow-y-auto">
      <div className="flex justify-center items-center mb-6 pt-5">
        <div className="w-[90%] space-y-6 pb-20">
          <h1 className="text-2xl font-bold text-white text-center">Payment History</h1>
          <AllUserCompletedPayments userAddress={currentAccount.address} />
        </div>
      </div>
    </div>
  )
} 