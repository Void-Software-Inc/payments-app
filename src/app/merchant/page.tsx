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
  
  // Apply a custom CSS class to the body when this page is mounted
  useEffect(() => {
    // Save the original overflow value
    const originalOverflow = document.body.style.overflow;
    
    // Enable scrolling on the body
    document.body.style.overflow = 'auto';
    
    // Clean up when the component unmounts
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);
  
  return (
    <main className="container mx-auto px-4 pt-20 pb-8 max-w-2xl">
      <Toaster position="bottom-center" richColors closeButton />
      <MerchantHeader />
      <PaymentAccountsList />
    </main>
  )
} 