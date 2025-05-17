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
import { PageTitle } from "../ask-payment/components/PageTitle"
import { PayCard } from "../../../pay/components/PayCard"
import { formatSuiBalance, truncateMiddle } from "@/utils/formatters"
import { ActionButtonsMerchant } from "../../components/ActionButtonsMerchant"

// USDC coin type constant
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"

// Function to save a completed payment to the database
async function saveCompletedPayment(data: {
  paymentId: string;
  paidAmount: string;
  tipAmount: string;
  issuedBy: string;
  paidBy: string;
  coinType: string;
  description?: string;
  transactionHash: string;
}) {
  try {
    // Ensure paidAmount is never zero if it can be avoided
    if (data.paidAmount === '0') {
      console.warn("Warning: Attempting to save payment with zero amount", data);
    } else {
      console.log("Saving payment with amount:", data.paidAmount);
    }
    
    console.log("Attempting to save payment to database:", data);
    
    const response = await fetch('/api/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error('Error saving payment:', responseData);
      return false;
    }
    
    console.log("Payment saved successfully:", responseData);
    return true;
  } catch (error) {
    console.error('Error saving payment to database:', error);
    return false;
  }
}

export default function MerchantPayPage() {
  const params = useParams()
  const router = useRouter()
  const merchantId = params.id as string
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
      
      // Get the intent details
      const intentDetails = await getIntent(currentAccount.address, paymentId);
      
      if (!intentDetails) {
        toast.error("Could not retrieve payment details. It may have already been paid.")
        setIsProcessing(false)
        return
      }
      
      // Extract intent information
      console.log("Intent details:", intentDetails);
      
      // Access description from fields
      const intentDescription = intentDetails.fields?.description || '';
      
      // Cast intent to access fields
      const intentFields = intentDetails.fields as any;
      const coinType = intentFields?.coinType || USDC_COIN_TYPE;
      
      // Get issuedBy from the correct fields
      let issuedBy = intentDetails.account || 
                     (intentDetails as any).accountId ||
                     intentFields?.issuedBy || 
                     (paymentId.length >= 66 ? paymentId.substring(0, 66) : '');
      
      // Get amount
      const argsAmount = (intentDetails as any)?.args?.amount?.toString();
      const fieldsAmount = intentFields?.amount?.toString();
      const amount = argsAmount || fieldsAmount || '0';
      
      // Create a new transaction
      const tx = new Transaction()
      
      // Set the sender address
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
        if (err.message?.includes('User rejected')) {
          toast.error("Transaction canceled by user")
          return null
        }
        throw err
      })
      
      if (txResult) {
        handleTxResult(txResult, toast)
        
        // Extract payment details from events
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
                tipAmount: data.tip || tip.toString() || '0',
                issuedBy: data.issued_by || issuedBy
              };
              
              // Verify amount is not zero
              if (paymentDetails.paidAmount === '0' || paymentDetails.paidAmount === 0) {
                paymentDetails.paidAmount = amount;
              }
              
              // Save payment details
              await saveCompletedPayment({
                paymentId: paymentDetails.paymentId,
                paidAmount: paymentDetails.paidAmount.toString(),
                tipAmount: paymentDetails.tipAmount.toString(),
                issuedBy: paymentDetails.issuedBy || issuedBy || 'undefined',
                paidBy: currentAccount.address,
                coinType,
                description: intentDescription,
                transactionHash: txResult.digest,
              });
              
              // Show success message
              const formattedAmount = formatSuiBalance(BigInt(paymentDetails.paidAmount));
              toast.success(`Paid ${formattedAmount} to ${truncateMiddle(paymentDetails.issuedBy)}`);
            } else {
              // Fallback if event parsing failed
              await saveCompletedPayment({
                paymentId,
                paidAmount: amount,
                tipAmount: tip.toString(),
                issuedBy: issuedBy || 'undefined',
                paidBy: currentAccount.address,
                coinType,
                description: intentDescription,
                transactionHash: txResult.digest,
              });
            }
          } catch (error) {
            console.warn("Error parsing payment events:", error);
          }
        }
        
        // Reset client and redirect
        resetClient();
        setTimeout(() => router.push(`/merchant/${merchantId}`), 1500)
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
      <ActionButtonsMerchant />
    </div>
  )
} 