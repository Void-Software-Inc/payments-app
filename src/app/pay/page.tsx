"use client"

import { useParams, useRouter } from "next/navigation"

import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { signAndExecute, handleTxResult } from "@/utils/Tx"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { usePaymentStore } from "@/store/usePaymentStore"
import { Button } from "@/components/ui/button"
import { AskPaymentActions } from "../merchant/[id]/ask-payment/components/AskPaymentActions"
import { PageTitle } from "../merchant/[id]/ask-payment/components/PageTitle"
import { PayCard } from "./components/PayCard"

// USDC coin type constant
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [paymentId, setPaymentId] = useState("")
  const [tipAmount, setTipAmount] = useState<bigint>(BigInt(0))
  
  const { initPaymentClient, makePayment, getPaymentDetail } = usePaymentClient()
  const { resetClient } = usePaymentStore()
  const currentAccount = useCurrentAccount()
  const signTransaction = useSignTransaction()
  const suiClient = useSuiClient()
  const [pageError, setPageError] = useState<string | null>(null)

  const handleMakePayment = async (paymentId: string, tip: bigint = BigInt(0)) => {
    if (!currentAccount?.address) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!paymentId) {
      toast.error("Payment ID is missing")
      return
    }

    if (pageError) {
      toast.error("Please reload the page and try again")
      return
    }

    try {
      setIsProcessing(true)
      
      // Get payment details to find the payment account ID
      const paymentDetail = await getPaymentDetail(currentAccount.address, "default", paymentId)
      
      if (!paymentDetail) {
        throw new Error("Payment not found")
      }
      
      // Create a new transaction
      const tx = new Transaction()
      
      // Call makePayment function with the payment ID and tip amount
      await makePayment(
        currentAccount.address,
        "default", // We're using the default payment account
        tx,
        paymentId,
        tip
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
        
        // Extract payment details from events if available
        if (txResult.events && txResult.events.length > 0) {
          try {
            const paymentEvent = txResult.events.find((event: any) => 
              event?.type?.includes('::payment_events::PaymentExecuted')
            );
            
            if (paymentEvent?.parsedJson) {
              const data = paymentEvent.parsedJson;
              console.log("Payment executed:", {
                paymentId: data.payment_id,
                timestamp: data.timestamp,
                paidAmount: data.amount,
                tipAmount: data.tip,
                issuedBy: data.issued_by
              });
            }
          } catch (error) {
            console.warn("Error parsing payment events:", error);
          }
        }
        
        // Reset client and trigger refresh
        resetClient();
        usePaymentStore.getState().triggerRefresh();
        
        // Redirect to a success page or home
        setTimeout(() => router.push('/'), 1500)
      }
      
    } catch (error: any) {
      console.error("Error making payment:", error)
      
      // Show appropriate error messages
      if (error.message?.includes('Payment not found')) {
        toast.error("Payment not found. Please check the payment ID and try again.")
      } else if (error.message?.includes('expired')) {
        toast.error("This payment request has expired. Payment intents are valid for 6 hours.")
      } else {
        toast.error("Failed to process payment. Please try again.")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-dvh w-dvw flex justify-center items-center">
      <div className="w-[90%] h-full pt-16 space-y-6">
        {/* Main Content */}
        <div className="flex items-center justify-between">
          <PageTitle title="Pay" />
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
          <PayCard onMakePayment={handleMakePayment} isProcessing={isProcessing} />
        )}
      </div>

      {/* Action Buttons */}
      <AskPaymentActions isProcessing={isProcessing} />
    </div>
  )
} 