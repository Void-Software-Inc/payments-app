"use client"

import { useParams, useRouter } from "next/navigation"
import { PaymentForm } from "./components/PaymentForm"
import { AskPaymentActions } from "./components/AskPaymentActions"
import { PageTitle } from "./components/PageTitle"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { signAndExecute, handleTxResult } from "@/utils/Tx"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { usePaymentStore } from "@/store/usePaymentStore"
import { Button } from "@/components/ui/button"

// USDC coin type constant
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"

export default function AskPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const paymentAccountId = params.id as string // This is the payment account ID
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { initPaymentClient, issuePayment, getPaymentAccount, getUserPaymentAccounts } = usePaymentClient()
  const { resetClient } = usePaymentStore()
  const currentAccount = useCurrentAccount()
  const signTransaction = useSignTransaction()
  const suiClient = useSuiClient()
  const [paymentAccount, setPaymentAccount] = useState<any>(null)
  const [pageError, setPageError] = useState<string | null>(null)

  // Ensure client is initialized with the payment account ID
  useEffect(() => {
    if (!currentAccount?.address || !paymentAccountId) return
    
    const initClient = async () => {
      try {
        // First get all payment accounts to find the one with matching ID
        const accounts = await getUserPaymentAccounts(currentAccount.address)
        const matchingAccount = accounts.find(acc => acc.id === paymentAccountId)
        
        if (matchingAccount) {
          setPaymentAccount(matchingAccount)
        }
        
        // Initialize with both user address and payment account ID
        await initPaymentClient(currentAccount.address, paymentAccountId)
        
        // Now fetch the full payment account details if needed
        if (!matchingAccount) {
          const account = await getPaymentAccount(currentAccount.address, paymentAccountId)
          setPaymentAccount(account)
        }
        
        setPageError(null)
      } catch (error) {
        console.error("Error initializing payment client:", error)
        setPageError("Could not initialize payment client. Please try again.")
      }
    }
    
    initClient()
  }, [currentAccount?.address, paymentAccountId])

  const handleGeneratePayment = async (amount: string, message: string) => {
    if (!currentAccount?.address) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!paymentAccountId) {
      toast.error("Payment account ID is missing")
      return
    }

    if (pageError) {
      toast.error("Please reload the page and try again")
      return
    }

    try {
      setIsProcessing(true)
      
      // Convert amount to bigint (USDC has 6 decimals)
      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 1_000_000))
      
      // Create a new transaction
      const tx = new Transaction()
      
      // Call issuePayment function with the payment account ID
      await issuePayment(
        currentAccount.address,
        paymentAccountId, // Using the payment account ID from the URL params
        tx,
        message || "Payment request",
        USDC_COIN_TYPE,
        amountInSmallestUnit
      )
      
      // Execute the transaction
      const txResult = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        toast
      }).catch(err => {
        // Handle user rejection of transaction
        if (err.message?.includes('User rejected')) {
          toast.error("Transaction canceled by user")
          return null
        }
        throw err
      })
      
      if (txResult) {
        handleTxResult(txResult, toast)
        // Reset client and trigger refresh for pending payments
        resetClient();
        usePaymentStore.getState().triggerRefresh();
        // Redirect to merchant dashboard or payment details page
        setTimeout(() => router.push(`/merchant/${paymentAccountId}`), 1500)
      }
      
    } catch (error: any) {
      console.error("Error generating payment:", error)
      
      // Check for Intent not registered error
      if (error.message?.includes('Intent') && error.message?.includes('not registered')) {
        toast.error("This feature is not available for this payment account. The payment intent is not registered.")
      } else {
        toast.error("Failed to generate payment. Please try again.")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-full w-full flex justify-center items-center">
      <div className="w-[90%] h-full pt-16 space-y-6">
        {/* Main Content */}
        <div className="flex items-center justify-between">
          <PageTitle title={paymentAccount ? `Ask Payment - ${paymentAccount.name}` : "Ask Payment"} />
          <Button 
            onClick={() => router.push(`/merchant/${paymentAccountId}`)}
            variant="ghost"
            className="text-zinc-400 hover:text-white"
          >
            Back to Account
          </Button>
        </div>
        {pageError ? (
          <div className="bg-red-500/10 p-4 rounded-lg text-red-600 text-center">
            {pageError}
            <Button 
              onClick={() => window.location.reload()}
              className="ml-2 underline"
            >
              Reload
            </Button>
          </div>
        ) : (
          <PaymentForm onGeneratePayment={handleGeneratePayment} isProcessing={isProcessing} />
        )}
      </div>

      {/* Action Buttons */}
      <AskPaymentActions isProcessing={isProcessing} />
    </div>
  )
} 