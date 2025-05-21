"use client"

import { useRouter } from "next/navigation"

import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { signAndExecute, handleTxResult } from "@/utils/Tx"
import { toast } from "sonner"
import { useState } from "react"
import { usePaymentStore } from "@/store/usePaymentStore"
import { Button } from "@/components/ui/button"
import { PageTitle } from "../merchant/[id]/ask-payment/components/PageTitle"
import { PayCard } from "./components/PayCard"
import { formatSuiBalance, truncateMiddle } from "@/utils/formatters"

// USDC coin type constant
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"

export default function PayPage() {
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { makePayment, getIntent } = usePaymentClient()
  const { refreshClient } = usePaymentStore()
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
      
      // Get the intent details BEFORE processing the payment
      // This is critical because after the payment is processed, the intent may be removed
      const intentDetails = await getIntent(currentAccount.address, paymentId);
      
      if (!intentDetails) {
        toast.error("Could not retrieve payment details. It may have already been paid.")
        setIsProcessing(false)
        return
      }
      
      // Check if the payment has expired
      if (intentDetails.fields?.expirationTime && intentDetails.fields?.creationTime) {
        const durationMs = Number(intentDetails.fields.expirationTime);
        const creationTime = Number(intentDetails.fields.creationTime);
        const expirationTimestamp = creationTime + durationMs;
        const now = Date.now();
        
        if (now > expirationTimestamp) {
          toast.error("This payment request has expired and cannot be processed.")
          setIsProcessing(false)
          return
        }
      }
      
      console.log("Intent details:", intentDetails);
      console.log("Intent fields:", intentDetails.fields);
      
      // Access description from fields.description which is how it's structured in the Intent
      const intentDescription = intentDetails.fields?.description || '';
      
      // Cast intent to access creator property via type assertion
      const intentFields = intentDetails.fields as any;
      const coinType = intentFields?.coinType || USDC_COIN_TYPE;
      
      // Get issuedBy from the correct fields: account is the primary source for issuedBy
      let issuedBy = intentDetails.account || 
                     (intentDetails as any).accountId ||
                     intentFields?.issuedBy || 
                     (paymentId.length >= 66 ? paymentId.substring(0, 66) : '');
      
      // Create a new transaction
      const tx = new Transaction()
      
      // Set the sender address to resolve CoinWithBalance
      tx.setSender(currentAccount.address)
      
      // Call makePayment
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
          console.log("Transaction events:", JSON.stringify(txResult.events));
          
          try {
            const paymentEvent = txResult.events.find((event: any) => 
              event?.type?.includes('::payment_events::PaymentExecuted')
            );
            
            if (paymentEvent?.parsedJson) {
              const data = paymentEvent.parsedJson;
              
              // Show success message with formatted amount and include tip if present
              const formattedAmount = formatSuiBalance(BigInt(data.amount));
              const tipAmount = data.tip_amount ? formatSuiBalance(BigInt(data.tip_amount)) : null;
              
              if (tipAmount) {
                toast.success(`Paid ${formattedAmount} + ${tipAmount} tip to ${truncateMiddle(data.issued_by || issuedBy)}`);
              } else {
                toast.success(`Paid ${formattedAmount} to ${truncateMiddle(data.issued_by || issuedBy)}`);
              }
            }
          } catch (error) {
            console.warn("Error parsing payment events:", error);
          }
        }
        
        // Reset client
        refreshClient();
        
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
    <div className="h-dvh w-dvw flex justify-center items-center overflow-y-auto">
      <div className="w-[90%] h-full space-y-6">
        {/* Main Content */}
        <div className="flex justify-center items-center w-full mb-6 pt-5">
          <h1 className="text-2xl font-bold text-white text-center">Pay</h1>
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
    </div>
  )
} 