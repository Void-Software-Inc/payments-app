"use client"

import { useEffect } from "react"
import { MerchantHeader } from "@/app/merchant/components/MerchantHeader"
import { PaymentAccountsList } from "@/app/merchant/components/PaymentAccountsList"

export default function MerchantPage() {
 
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
    <main className="w-dvw h-dvh container mx-auto px-4 mt-20 pb-8 max-w-2xl">
      <MerchantHeader />
      <PaymentAccountsList />
    </main>
  )
} 