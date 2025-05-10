"use client"

import { CreatePaymentForm } from "./components/CreatePaymentForm"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function CreatePaymentAccountPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <Link href="/merchant">
          <Button variant="ghost" className="rounded-full p-2 mb-4">
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">Create Payment Account</h1>
        <p className="text-muted-foreground">Set up a new payment account</p>
      </div>
      
      <CreatePaymentForm />
    </div>
  )
} 