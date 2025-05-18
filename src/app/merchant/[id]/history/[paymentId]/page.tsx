"use client"

import { useParams } from "next/navigation"
import { PaymentHistoryDetails } from "./components/PaymentHistoryDetails"

export default function PaymentDetailPage() {
  const params = useParams()
  const merchantId = params.id as string
  const paymentId = params.paymentId as string

  return (
    <div className="h-dvh w-dvw overflow-y-auto">
      <div className="container mx-auto px-4 max-w-md pb-20">
        <div className="flex justify-center items-center w-full mb-6 pt-5">
          <h1 className="text-2xl font-bold text-white">Payment Details</h1>
        </div>
        
        <div className="py-4">
          <PaymentHistoryDetails merchantId={merchantId} paymentId={paymentId} />
        </div>
      </div>
    </div>
  )
} 