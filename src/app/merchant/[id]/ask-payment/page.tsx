"use client"

import { useParams, useRouter } from "next/navigation"
import { PaymentForm } from "./components/PaymentForm"
import { PageTitle } from "./components/PageTitle"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { signAndExecute, handleTxResult } from "@/utils/Tx"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { usePaymentStore } from "@/store/usePaymentStore"
import { Button } from "@/components/ui/button"
import { ActionButtonsMerchant } from "../../components/ActionButtonsMerchant"

// USDC coin type constant
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC"

export default function AskPaymentPage() {
  const params = useParams()
  const router = useRouter()
  const paymentAccountId = params.id as string // This is the payment account ID
  const [isProcessing, setIsProcessing] = useState(false)
  const [isClientReady, setIsClientReady] = useState(false)
  
  const { initPaymentClient, issuePayment, getPaymentAccount, getUserPaymentAccounts } = usePaymentClient()
  const { refreshClient } = usePaymentStore()
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
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
        setIsClientReady(true)
      } catch (error) {
        console.error("Error initializing payment client:", error)
        setPageError("Could not initialize payment client. Please try again.")
        setIsClientReady(false)
        // Retry initialization after a delay
        setTimeout(() => initClient(), 1000)
      }
    }
    
    initClient()
  }, [currentAccount?.address, paymentAccountId, refreshCounter])

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

    if (!isClientReady) {
      toast.error("Payment client is still initializing. Please wait a moment and try again.")
      return
    }

    try {
      setIsProcessing(true)
      
      // Convert amount to bigint (USDC has 6 decimals)
      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 1_000_000))
      
      // Log the amount for debugging purposes
      console.log("Issuing payment with amount:", amount, "converted to smallest unit:", amountInSmallestUnit.toString())
      
      // Retry logic for issuePayment (only for initialization issues, not user rejections)
      let retryCount = 0
      const maxRetries = 2
      let lastError = null
      
      while (retryCount <= maxRetries) {
        try {
          // Create a new transaction
          const tx = new Transaction()
          // Note: We don't set gas budget here to let the wallet handle it
          
          // Call issuePayment function with the payment account ID
          await issuePayment(
            currentAccount.address,
            paymentAccountId, // Using the payment account ID from the URL params
            tx,
            message || "Payment request",
            USDC_COIN_TYPE,
            amountInSmallestUnit
          )
          
          // Execute the transaction - handle user rejection immediately
          const txResult = await signAndExecute({
            suiClient,
            currentAccount,
            tx,
            signTransaction,
            toast
          })

          handleTxResult(txResult, toast)
          refreshClient();
          // Redirect to home payment account page
          router.push(`/merchant/${paymentAccountId}`)
          return // Success, exit the function
          
        } catch (error: any) {
          console.log("Transaction error:", error)
          
          // Comprehensive user rejection detection
          const isUserRejection = 
            error?.code === 4001 || // Standard wallet rejection code
            error?.code === -32603 || // Another common rejection code
            error?.message?.toLowerCase().includes('user') ||
            error?.message?.toLowerCase().includes('reject') ||
            error?.message?.toLowerCase().includes('cancel') ||
            error?.message?.toLowerCase().includes('denied') ||
            error?.message?.toLowerCase().includes('abort') ||
            error?.cause?.message?.toLowerCase().includes('user') ||
            error?.cause?.message?.toLowerCase().includes('reject') ||
            String(error).toLowerCase().includes('user') ||
            String(error).toLowerCase().includes('reject')
          
          if (isUserRejection) {
            toast.error("Transaction canceled by user")
            return // Exit immediately, don't retry
          }
          
          lastError = error
          retryCount++
          
          if (retryCount <= maxRetries) {
            console.log(`Payment attempt ${retryCount} failed, retrying...`)
            // Wait briefly before retrying
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }
      
      // If we get here, all retries failed
      throw lastError
      
    } catch (error: any) {
      console.error("Error generating payment:", error)
      
      // Handle user rejection of transaction (shouldn't reach here now, but keeping as fallback)
      const isUserRejection = 
        error?.code === 4001 || 
        error?.code === -32603 ||
        error?.message?.toLowerCase().includes('user') ||
        error?.message?.toLowerCase().includes('reject') ||
        error?.message?.toLowerCase().includes('cancel') ||
        String(error).toLowerCase().includes('user') ||
        String(error).toLowerCase().includes('reject')
      
      if (isUserRejection) {
        toast.error("Transaction canceled by user")
        return
      }
      
      // Check for Intent not registered error
      if (error.message?.includes('Intent') && error.message?.includes('not registered')) {
        toast.error("This feature is not available for this payment account. The payment intent is not registered.")
      } else {
        toast.error(error.message || "Failed to generate payment. Please try again.")
      }
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="h-dvh w-dvw flex justify-center items-center overflow-y-auto">
      <div className="w-[90%] h-full pt-16 space-y-6 mb-24">
        {/* Main Content */}
        <div className="flex items-center justify-center pt-1">
          <PageTitle title="Ask Payment" />
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
          <PaymentForm 
            onGeneratePayment={handleGeneratePayment} 
            isProcessing={isProcessing || !isClientReady}
            accountName={paymentAccount?.name} 
          />
        )}
      </div>

      {/* Action Buttons */}
      <ActionButtonsMerchant />
    </div>
  )
} 