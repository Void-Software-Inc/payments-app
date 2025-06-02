"use client"

import { useRouter } from "next/navigation"

import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit"
import { Transaction } from "@mysten/sui/transactions"
import { signAndExecute, handleTxResult } from "@/utils/Tx"
import { toast } from "sonner"
import { useState } from "react"
import { usePaymentStore } from "@/store/usePaymentStore"
import { useCompletedIntents } from "@/hooks/useCompletedIntents"
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
  const { addCompletedIntent } = useCompletedIntents()
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
      
      // Inform user about multiple transactions if tip is included
      if (tip > 0) {
        toast.info("You'll need to approve 2 transactions: one for the payment and one for the tip.");
      }
      
      // Ensure paymentId is properly sanitized
      const sanitizedPaymentId = paymentId.trim();
      
      console.log(`Attempting to retrieve intent for payment ID: ${sanitizedPaymentId}`);
      
      // Get the intent details BEFORE processing the payment with retry logic
      let intentDetails = null;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries && !intentDetails) {
        try {
          intentDetails = await getIntent(currentAccount.address, sanitizedPaymentId);
          if (intentDetails) break;
        } catch (innerError) {
          console.warn(`Attempt ${retryCount + 1} failed to get intent:`, innerError);
        }
        
        // Only wait if we're going to retry
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
        }
        retryCount++;
      }
      
      if (!intentDetails) {
        toast.error("Could not retrieve payment details. The payment may not exist or has already been paid.")
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
      
      // Get payment amount from intent
      const intentFields = intentDetails.fields || {};
      const intentArgs = intentDetails.args || {};
      
      const paymentAmount = 
        (intentArgs as any)?.amount?.toString() || 
        (intentFields as any)?.amount?.toString() || 
        ((intentDetails as any)?.args?.amount?.toString()) || 
        ((intentDetails as any)?.fields?.amount?.toString()) || 
        '0';
      
      // Validate total balance (payment + tip) BEFORE processing
      if (tip > 0) {
        console.log(`Validating balance for payment: ${paymentAmount} + tip: ${tip.toString()}`);
        
        // Get current USDC balance
        const usdcBalance = await suiClient.getBalance({
          owner: currentAccount.address,
          coinType: USDC_COIN_TYPE,
        });
        
        const totalBalanceRequired = BigInt(paymentAmount) + tip;
        const availableBalance = BigInt(usdcBalance.totalBalance);
        
        console.log(`Total required: ${totalBalanceRequired.toString()}, Available: ${availableBalance.toString()}`);
        
        if (availableBalance < totalBalanceRequired) {
          const requiredUSDC = Number(totalBalanceRequired) / 1_000_000;
          const availableUSDC = Number(availableBalance) / 1_000_000;
          toast.error(`Insufficient USDC balance. Required: $${requiredUSDC.toFixed(2)}, Available: $${availableUSDC.toFixed(2)}`);
          setIsProcessing(false);
          return;
        }
      }
      
      // Get issuedBy from the correct fields: account is the primary source for issuedBy
      let issuedBy = intentDetails.account || 
                     (intentDetails as any).accountId ||
                     (intentArgs as any)?.issuedBy || 
                     (paymentId.length >= 66 ? paymentId.substring(0, 66) : '');
      
      // Create a transaction for the payment only (no tip in this transaction)
      const tx = new Transaction()
      
      // Set the sender address to resolve CoinWithBalance
      tx.setSender(currentAccount.address)
      
      // Call makePayment for the original amount only
      await makePayment(
        currentAccount.address,
        tx,
        sanitizedPaymentId
      )
      
      // Execute the payment transaction
      const txResult = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        toast
      })
      
      handleTxResult(txResult, toast);

      // If there's a tip, handle it in a separate transaction immediately after
      if (tip && tip > 0 && issuedBy) {
        console.log(`Processing tip transfer of ${tip.toString()} to ${issuedBy} in separate transaction`);
        
        try {
          const tipTx = new Transaction()
          tipTx.setSender(currentAccount.address)
          
          const targetAddress = issuedBy.startsWith('0x') ? issuedBy : `0x${issuedBy}`;
          
          // Get fresh USDC coins for tip (after payment is completed)
          const usdcCoins = await suiClient.getCoins({
            owner: currentAccount.address,
            coinType: USDC_COIN_TYPE,
          });
          
          if (usdcCoins.data.length > 0 && BigInt(usdcCoins.data[0].balance) >= tip) {
            const [tipCoin] = tipTx.splitCoins(tipTx.object(usdcCoins.data[0].coinObjectId), [tip]);
            tipTx.transferObjects([tipCoin], targetAddress);
            
            // Execute tip transaction
            const tipTxResult = await signAndExecute({
              suiClient,
              currentAccount,
              tx: tipTx,
              signTransaction,
              toast
            })
            
            handleTxResult(tipTxResult, toast);
            console.log("Tip transaction completed successfully");
          } else {
            console.warn("Insufficient USDC balance for tip after payment");
            toast.warning("Payment completed, but insufficient balance for tip");
          }
        } catch (tipError) {
          console.error("Error processing tip:", tipError);
          toast.warning("Payment completed successfully, but tip transfer failed");
        }
      }
      
      // Store the intent before refreshing client
      if (intentDetails) {
        console.log("Storing intent before refresh:", sanitizedPaymentId);
        await addCompletedIntent(intentDetails, sanitizedPaymentId, txResult.digest, tip);
      }
      
      refreshClient();
      router.push('/');
      
    } catch (error: any) {
      console.error("Error making payment:", error)
      
      // Show more detailed error messages
      if (error.message?.includes('not found') || error.message?.includes('Intent not found')) {
        toast.error("Payment not found. Please check the payment ID and try again.")
      } else if (error.message?.includes('expired')) {
        toast.error("This payment request has expired.")
      } else if (error.message?.includes('insufficient') || error.message?.includes('Insufficient')) {
        toast.error("Insufficient funds. Please check your USDC balance.")
      } else if (error.message?.includes('already paid') || error.message?.includes('already processed')) {
        toast.error("This payment has already been completed.")
      } else if (error.message?.includes('transaction cost') || error.message?.includes('gas')) {
        toast.error("Not enough SUI for gas fees.")
      } else if (error.message?.includes('denied') || error.message?.includes('rejected')) {
        toast.error("Transaction was rejected.")
      } else {
        toast.error("Failed to process payment: " + (error.message || "Unknown error"))
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