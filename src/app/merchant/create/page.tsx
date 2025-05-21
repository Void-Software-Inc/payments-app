"use client"

import { CreatePaymentForm } from "./components/CreatePaymentForm"
import { usePaymentStore } from "@/store/usePaymentStore"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function CreatePaymentAccountPage() {
  const { refreshClient } = usePaymentStore()
  const router = useRouter()
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Reset client when user navigates away from the page
      refreshClient()
    }
  }, [refreshClient])
  
  return (
    <CreatePaymentForm />
  )
} 