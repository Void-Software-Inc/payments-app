"use client"

import { useParams, useRouter } from "next/navigation"
import { PaymentForm } from "./components/PaymentForm"
import { AskPaymentActions } from "./components/AskPaymentActions"
import { PageTitle } from "./components/PageTitle"

export default function AskPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const merchantId = params.id as string

  const handleGeneratePayment = (amount: string, message: string) => {
    // Implement payment generation logic here
    console.log("Generate payment with:", { amount, message })
  }

  return (
    <div className="h-full w-full flex justify-center items-center">
<div className="w-[90%] h-full pt-16 space-y-6">
      {/* Main Content */}
        <PageTitle title="Ask Payment" />
        <PaymentForm onGeneratePayment={handleGeneratePayment} />

      </div>

      {/* Action Buttons */}
      <AskPaymentActions />
    </div>
  )
} 