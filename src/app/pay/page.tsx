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
import { formatSuiBalance, truncateMiddle } from "@/utils/formatters"

// USDC coin type constant
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"

export default function PayPage() {
  const params = useParams()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { initPaymentClient, makePayment, getIntent } = usePaymentClient()
  const { resetClient } = usePaymentStore()
  const currentAccount = useCurrentAccount()
  const signTransaction = useSignTransaction()
  const suiClient = useSuiClient()
  const [pageError, setPageError] = useState<string | null>(null)

  // Initialize client 
  useEffect(() => {
    if (!currentAccount?.address) return
    
    const initClient = async () => {
      try {
        // Initialize client with user's address
        await initPaymentClient(currentAccount.address)
      } catch (error) {
        console.error("Error initializing payment client:", error)
        setPageError("Could not initialize payment client. Please try again.")
      }
    }
    
    initClient()
  }, [currentAccount?.address, initPaymentClient])

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
      
      // Get the intent details directly to verify payment exists
      const intent = await getIntent(currentAccount.address, paymentId)
      
      if (!intent) {
        throw new Error("Payment not found")
      }
      
      // Create a new transaction
      const tx = new Transaction()
      
      // Simplified: Call makePayment without the merchantAccountId
      await makePayment(
        currentAccount.address,
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
              const paymentDetails = {
                paymentId: data.payment_id,
                timestamp: data.timestamp,
                paidAmount: data.amount,
                tipAmount: data.tip,
                issuedBy: data.issued_by
              };
              
              console.log("Payment executed:", paymentDetails);
              
              // Show success message with formatted amount
              const formattedAmount = formatSuiBalance(BigInt(paymentDetails.paidAmount));
              toast.success(`Paid ${formattedAmount} to ${truncateMiddle(paymentDetails.issuedBy)}`);
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
        toast.error("This payment request has expired.")
      } else if (error.message?.includes('Insufficient balance')) {
        toast.error("Insufficient funds. Please check your USDC balance.")
      } else if (error.message?.includes('already paid')) {
        toast.error("This payment has already been completed.")
      } else if (error.message?.includes('transaction cost') || error.message?.includes('gas')) {
        toast.error("Not enough SUI for gas fees.")
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