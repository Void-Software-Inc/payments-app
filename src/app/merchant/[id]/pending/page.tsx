"use client"

import { useParams } from "next/navigation"
import { AllPendingPayments } from "./components/AllPendingPayments"
import { PageTitle } from "./components/PageTitle"

export default function PendingPaymentsPage() {
  const params = useParams()
  const merchantId = params.id as string

  return (
    <div className="h-dvh w-dvw overflow-y-auto">
      <div className="flex justify-center items-center mb-6 pt-5">
        <div className="w-[90%]  space-y-6 pb-20">
          <h1 className="text-2xl font-bold text-white text-center">Pending Payment</h1>
          <AllPendingPayments merchantId={merchantId} />
        </div>
      </div>
    </div>
  )
} 