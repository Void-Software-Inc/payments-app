"use client"

import { useEffect, useState } from "react"
import { PaymentAccountsList } from "@/app/merchant/components/PaymentAccountsList"

export default function MerchantPage() {
  const [accountCount, setAccountCount] = useState<number>(0);
 
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
  
  const handleAccountsLoaded = (count: number) => {
    setAccountCount(count);
  };
  
  return (
    <div className="w-full min-h-screen bg-[#212229]">
      <main className="w-full min-h-screen container mx-auto px-4 pt-6 pb-8 max-w-2xl">
        <div className="flex justify-center items-center w-full mb-6">
            <h1 className="text-2xl font-bold text-white text-center">
              Merchant Accounts
            </h1>
        </div>
        <PaymentAccountsList onAccountsLoaded={handleAccountsLoaded} />
      </main>
    </div>
  )
} 