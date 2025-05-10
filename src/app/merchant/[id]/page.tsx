"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Payment } from "@account.tech/payment";
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount } from "@mysten/dapp-kit"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Toaster } from "sonner"
import { usePaymentStore } from "@/store/usePaymentStore"

export default function PaymentAccountPage() {
  const params = useParams()
  const router = useRouter()
  const { getPaymentAccount } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const getOrInitClient = usePaymentStore(state => state.getOrInitClient);
  const [paymentAcc, setPaymentAcc] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const accountId = params.id as string
  
  useEffect(() => {
    const initPaymentClient = async () => {
      if (!currentAccount?.address) return;

      try {
        setIsLoading(true);
        const fetchingPaymentAccount = await getPaymentAccount(currentAccount.address, accountId);
        setPaymentAcc(fetchingPaymentAccount)
      } catch (error) {
        console.error("Error initializing dao:", error);
        setPaymentAcc(null)
      } finally {
        setIsLoading(false);
      }
    };

    initPaymentClient();
  }, [currentAccount?.address, accountId, getOrInitClient]);

  // Get account name from metadata
  const accountName = paymentAcc?.metadata?.find(item => item.key === "name")?.value || "Unnamed Account";
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center p-8">Loading payment account...</div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-red-500 p-4">{error}</div>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => router.push("/merchant")}
        >
          Back to Payment Accounts
        </Button>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <Toaster position="bottom-center" richColors closeButton />
      <div className="mb-6">
        <Link href="/merchant">
          <Button variant="ghost" className="rounded-full p-2 mb-4">
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold text-white">{accountName}</h1>
        <p className="text-muted-foreground text-sm">ID: {accountId}</p>
      </div>
      
      {/* Payment account details can be added here */}
      <div className="bg-card p-6 rounded-lg shadow-lg">
        <h2 className="text-xl mb-4">Account Details</h2>
        
        {/* Placeholder for account details */}
        <div className="grid gap-4">
          <div>
            <h3 className="text-sm font-medium">Balance</h3>
            <p>Not implemented yet</p>
          </div>
          
          <div>
            <h3 className="text-sm font-medium">Actions</h3>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button variant="outline" size="sm">Deposit</Button>
              <Button variant="outline" size="sm">Withdraw</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 