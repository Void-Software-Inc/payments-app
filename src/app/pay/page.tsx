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
import { ActionButtonsCustomer } from "@/components/ActionButtonsCustomer"

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
  creationTime?: string | null;
}) {
  // Function to retry save with exponential backoff
  const retrySave = async (attempt = 1, maxAttempts = 3, delay = 1000) => {
    try {
      // Ensure paidAmount is never zero if it can be avoided
      if (data.paidAmount === '0') {
        console.warn("Warning: Attempting to save payment with zero amount", data);
      } else {
        console.log("Saving payment with amount:", data.paidAmount);
      }
      
      console.log(`Attempt ${attempt}/${maxAttempts}: Saving payment to database:`, data);
      
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      // Get response text for debugging
      const responseText = await response.text();
      let responseData;
      
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        console.log("Response is not valid JSON:", responseText);
      }
      
      console.log(`Save attempt ${attempt} response:`, response.status, responseData || responseText);
      
      if (!response.ok) {
        console.error(`Error saving payment (attempt ${attempt}):`, responseData || responseText);
        
        // If we have retries left, try again after a delay
        if (attempt < maxAttempts) {
          console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return retrySave(attempt + 1, maxAttempts, delay * 2);
        }
        return false;
      }
      
      console.log("Payment saved successfully:", responseData);
      return true;
    } catch (error) {
      console.error(`Error saving payment to database (attempt ${attempt}):`, error);
      
      // If we have retries left, try again after a delay
      if (attempt < maxAttempts) {
        console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return retrySave(attempt + 1, maxAttempts, delay * 2);
      }
      return false;
    }
  };
  
  // Start the retry process
  return retrySave();
}

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
      
      // Extract intent information properly accessing the fields
      console.log("Intent details:", intentDetails);
      console.log("Intent fields:", intentDetails.fields);
      
      // Access description from fields.description which is how it's structured in the Intent
      const intentDescription = intentDetails.fields?.description || '';
      
      // Extract creation time if available
      const creationTime = intentDetails.fields?.creationTime ? 
        String(intentDetails.fields.creationTime) : null;
      console.log("Intent creation time:", creationTime);
      
      console.log("Final intent description:", intentDescription);
      
      // Cast intent to access creator property via type assertion
      const intentFields = intentDetails.fields as any;
      const coinType = intentFields?.coinType || USDC_COIN_TYPE;
      
      // Get issuedBy from the correct fields: account is the primary source for issuedBy
      let issuedBy = intentDetails.account || 
                     (intentDetails as any).accountId ||
                     intentFields?.issuedBy || 
                     (paymentId.length >= 66 ? paymentId.substring(0, 66) : '');
      
      console.log("Final issuedBy value:", issuedBy || 'unknown (will be filled from events)');
      
      // Ensure we get a valid non-zero amount by checking both intentFields.amount and args.amount
      const argsAmount = (intentDetails as any)?.args?.amount?.toString();
      const fieldsAmount = intentFields?.amount?.toString();
      const amount = argsAmount || fieldsAmount || '0';
      console.log("Payment amount from intent:", amount, "argsAmount:", argsAmount, "fieldsAmount:", fieldsAmount);
      
      // Verify we have a meaningful amount to process
      if (amount === '0') {
        console.warn("Warning: Payment amount is zero - check intent structure");
      }
      
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
            
            console.log("Found payment event:", paymentEvent ? "YES" : "NO", 
              paymentEvent ? JSON.stringify(paymentEvent) : "");
            
            if (paymentEvent?.parsedJson) {
              const data = paymentEvent.parsedJson;
              
              // Add detailed logging for the issued_by field
              console.log("Payment event data:", data);
              console.log("Event issued_by field:", data.issued_by);
              
              const paymentDetails = {
                paymentId: data.payment_id,
                timestamp: data.timestamp,
                paidAmount: data.amount,
                tipAmount: data.tip || tip.toString() || '0',
                issuedBy: data.issued_by || issuedBy
              };
              
              console.log("Payment executed:", paymentDetails);
              
              // Verify amount is not zero
              if (paymentDetails.paidAmount === '0' || paymentDetails.paidAmount === 0) {
                console.warn("Warning: Event shows payment amount is zero, using intent amount instead");
                paymentDetails.paidAmount = amount;
              }
              
              // Use the correct issuedBy value in completed payment
              await saveCompletedPayment({
                paymentId: paymentDetails.paymentId,
                paidAmount: paymentDetails.paidAmount.toString(),
                tipAmount: paymentDetails.tipAmount.toString(),
                issuedBy: paymentDetails.issuedBy || issuedBy || 'undefined',
                paidBy: currentAccount.address,
                coinType,
                description: intentDescription,
                transactionHash: txResult.digest,
                creationTime: creationTime,
              });
              
              // Show success message with formatted amount
              const formattedAmount = formatSuiBalance(BigInt(paymentDetails.paidAmount));
              toast.success(`Paid ${formattedAmount} to ${truncateMiddle(paymentDetails.issuedBy)}`);
            } else {
              // Fallback if we couldn't extract details from the event
              // Still attempt to save the payment with what we know
              await saveCompletedPayment({
                paymentId,
                paidAmount: amount,
                tipAmount: tip.toString(),
                issuedBy: issuedBy || 'undefined',
                paidBy: currentAccount.address,
                coinType,
                description: intentDescription,
                transactionHash: txResult.digest,
                creationTime: creationTime,
              });
            }
          } catch (error) {
            console.warn("Error parsing payment events:", error);
            // Attempt to save with basic information even if parsing failed
            await saveCompletedPayment({
              paymentId,
              paidAmount: amount,
              tipAmount: tip.toString(),
              issuedBy: issuedBy || 'undefined',
              paidBy: currentAccount.address,
              coinType,
              description: intentDescription,
              transactionHash: txResult.digest,
              creationTime: creationTime,
            });
          }
        }
        
        // Reset client and trigger refresh
        resetClient();
        usePaymentStore.getState().triggerRefresh();
        
        // Ensure we save payment data regardless of event processing
        // This is a backup approach that will save minimal information if the event parsing fails
        try {
          console.log("Attempting backup payment save with minimal information");
          
          // Enhanced backup mechanism with retry functionality
          const saveData = {
            paymentId,
            paidAmount: amount,
            tipAmount: tip.toString(),
            issuedBy: issuedBy || 'undefined',
            paidBy: currentAccount.address,
            coinType,
            description: intentDescription,
            transactionHash: txResult.digest,
            creationTime: creationTime,
            backup: true
          };
          
          console.log("Backup payment data:", saveData);
          
          // Function to retry save with exponential backoff
          const retrySave = async (attempt = 1, maxAttempts = 3, delay = 1000) => {
            try {
              const response = await fetch('/api/payments/force-save', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(saveData),
              });
              
              const responseText = await response.text();
              console.log(`Backup save attempt ${attempt} response:`, response.status, responseText);
              
              if (response.ok) {
                console.log("Backup payment save successful");
                return true;
              } else {
                console.error(`Backup save attempt ${attempt} failed:`, response.status, responseText);
                
                // If we have retries left, try again after a delay
                if (attempt < maxAttempts) {
                  console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})...`);
                  await new Promise(resolve => setTimeout(resolve, delay));
                  return retrySave(attempt + 1, maxAttempts, delay * 2);
                } else {
                  console.error("All backup save attempts failed");
                  return false;
                }
              }
            } catch (err) {
              console.error(`Error in backup save attempt ${attempt}:`, err);
              
              // If we have retries left, try again after a delay
              if (attempt < maxAttempts) {
                console.log(`Retrying in ${delay}ms (attempt ${attempt + 1}/${maxAttempts})...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                return retrySave(attempt + 1, maxAttempts, delay * 2);
              } else {
                console.error("All backup save attempts failed");
                return false;
              }
            }
          };
          
          // Start the retry process
          retrySave().then(success => {
            if (success) {
              console.log("Backup payment was successfully saved after retries");
            } else {
              console.error("Failed to save backup payment after multiple attempts");
            }
          });
        } catch (backupError) {
          console.error("Failed to execute backup save:", backupError);
        }
        
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
      <ActionButtonsCustomer />
    </div>
  )
} 