"use client"

import { useParams } from "next/navigation"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { PaymentUserDetails } from "./components/PaymentUserDetails"

export default function PaymentDetailPage() {
  const params = useParams()
  const currentAccount = useCurrentAccount()
  const paymentId = params.paymentId as string

  // If not connected, show nothing
  if (!currentAccount?.address) {
    return null;
  }

  return (
    <div className="h-dvh w-dvw overflow-y-auto">
      <div className="container mx-auto px-4 max-w-md pb-20">
        <div className="flex justify-center items-center w-full mb-6 pt-5">
          <h1 className="text-2xl font-bold text-white">Payment Details</h1>
        </div>
        
        <div className="py-4">
          <PaymentUserDetails userAddress={currentAccount.address} paymentId={paymentId} />
        </div>
      </div>
    </div>
  )
} 