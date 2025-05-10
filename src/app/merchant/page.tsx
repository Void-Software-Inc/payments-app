"use client"

import { useEffect } from "react"
import { MerchantHeader } from "@/app/merchant/components/MerchantHeader"
import { PaymentAccountsList } from "@/app/merchant/components/PaymentAccountsList"
import { Toaster } from "sonner"
import { usePaymentStore } from "@/store/usePaymentStore"
import { useCurrentAccount } from "@mysten/dapp-kit"

export default function MerchantPage() {
  const { triggerRefresh } = usePaymentStore()
  const currentAccount = useCurrentAccount()
  
  // Trigger a refresh when the page loads
  useEffect(() => {
    if (currentAccount?.address) {
      triggerRefresh()
    }
  }, [currentAccount?.address, triggerRefresh])
  
  return (
    <div className="container mx-auto px-4 py-6">
      <Toaster position="bottom-center" richColors closeButton />
      <MerchantHeader />
      <PaymentAccountsList />
    </div>
  )
} 