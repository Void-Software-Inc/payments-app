"use client"

import { useParams } from "next/navigation"
import { AllCompletedPayments } from "./components/AllCompletedPayments"

export default function HistoryPage() {
  const params = useParams()
  const merchantId = params.id as string

  return (
    <div className="h-dvh w-dvw overflow-y-auto">
      <div className="flex justify-center items-center mb-6 pt-5">
        <div className="w-[90%] space-y-6 pb-20">
          <h1 className="text-2xl font-bold text-white text-center">Payment History</h1>
          <AllCompletedPayments merchantId={merchantId} />
        </div>
      </div>
    </div>
  )
} 