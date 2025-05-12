"use client"

import { CreatePaymentForm } from "./components/CreatePaymentForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { usePaymentStore } from "@/store/usePaymentStore"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function CreatePaymentAccountPage() {
  const { resetClient } = usePaymentStore()
  const router = useRouter()
  
  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      // Reset client when user navigates away from the page
      resetClient()
    }
  }, [resetClient])
  
  const handleGoBack = () => {
    // Reset client state to prevent errors
    resetClient()
    // Navigate back to merchant page
    router.push("/merchant")
  }
  
  return (
    <div className="container mx-auto px-4 pt-16">
      <div className="mb-6">

        
        <h1 className="text-2xl font-bold text-white">Create Payment Account</h1>
        <p className="text-zinc-200">Set up a new payment account</p>
      </div>
      
      <CreatePaymentForm />
    </div>
  )
} 