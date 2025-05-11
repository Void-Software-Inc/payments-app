"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Payment } from "@account.tech/payment";
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { Toaster } from "sonner"
import { usePaymentStore } from "@/store/usePaymentStore"
import { BalanceCard } from "@/components/BalanceCard"
import { truncateMiddle } from "@/utils/formatters"
import { User } from "lucide-react"
import Link from "next/link"
import { WalletInfoCard } from "@/components/WalletInfoCard"

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
  }, [currentAccount?.address, accountId, getOrInitClient, getPaymentAccount]);

  // Get account name from metadata
  const accountName = paymentAcc?.metadata?.find(item => item.key === "name")?.value || "Unnamed Account";
  
  if (isLoading) {
    return (
      <div className="w-full pt-20">
        <div className="container mx-auto px-4 py-0 max-w-2xl">
          <div className="flex justify-center p-8">Loading payment account...</div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="w-full pt-20">
        <div className="container mx-auto px-4 py-0 max-w-2xl">
          <div className="text-red-500 p-4">{error}</div>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push("/merchant")}
          >
            Back to Payment Accounts
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full pt-20">
      <div className="container mx-auto px-4 py-0 max-w-2xl">
        <Toaster position="bottom-center" richColors closeButton />
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">{accountName}</h1>
            <p className="text-zinc-200 ml-1 text-sm">ID: {truncateMiddle(accountId)}</p>
          </div>
        </div>
        
        {/* Balance Card */}
        <div className="mb-6">
          <BalanceCard 
            title="Account Balance" 
            accountId={accountId}
            customBalance={BigInt(0)} // Replace with actual balance when available
          />
        </div>
        
        {/* Wallet Info Card */}
        <div className="mb-6">
          <WalletInfoCard merchantId={accountId} />
        </div>
    
      </div>
    </div>
  )
} 