"use client"

import { MerchantHeader } from "@/app/merchant/components/MerchantHeader"
import { PaymentAccountsList } from "@/app/merchant/components/PaymentAccountsList"

export default function MerchantPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <MerchantHeader />
      <PaymentAccountsList />
    </div>
  )
} 