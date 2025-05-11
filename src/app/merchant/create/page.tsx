"use client"

import { CreatePaymentForm } from "./components/CreatePaymentForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function CreatePaymentAccountPage() {
  return (
    <div className="container mx-auto px-4 pt-16">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-white">Create Payment Account</h1>
        <p className="text-zinc-200">Set up a new payment account</p>
      </div>
      
      <CreatePaymentForm />
    </div>
  )
} 