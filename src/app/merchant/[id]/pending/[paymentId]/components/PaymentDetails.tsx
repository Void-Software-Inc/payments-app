"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, Trash2 } from "lucide-react"
import { useCurrentAccount, useSignTransaction, useSuiClient } from "@mysten/dapp-kit"
import { usePaymentClient, PendingPayment, IntentStatus } from "@/hooks/usePaymentClient"
import { usePaymentStore } from "@/store/usePaymentStore"
import { Transaction } from "@mysten/sui/transactions"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { signAndExecute, handleTxResult } from "@/utils/Tx"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Link from "next/link"

interface PaymentDetailsProps {
  merchantId: string
  paymentId: string
}

export function PaymentDetails({ merchantId, paymentId }: PaymentDetailsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const { deletePayment, getIntentStatus, getFilteredIntents, getDisplayIntents, isOwnerAddress, getPaymentAccount, completeWithdraw } = usePaymentClient()
  const { refreshClient } = usePaymentStore()
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  const signTransaction = useSignTransaction()
  const suiClient = useSuiClient()
  
  const [payment, setPayment] = useState<PendingPayment | null>(null)
  const [intentStatus, setIntentStatus] = useState<IntentStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [copied, setCopied] = useState(false)
  const [intentInfo, setIntentInfo] = useState<string>("")
  const [isOwner, setIsOwner] = useState<boolean>(false)
  const [hasMultipleMembers, setHasMultipleMembers] = useState<boolean>(false)
  const [isValidating, setIsValidating] = useState(false)

  useEffect(() => {
    // Only proceed if we have the wallet address
    if (!currentAccount?.address) {
      return;
    }
    
    let isMounted = true;
    const fetchPaymentDetails = async () => {
      setIsLoading(true)
      try {
        // Get all intents
        const allIntents = await getFilteredIntents(currentAccount.address, merchantId);
        
        // Get the specific intent we're looking for
        const intent = allIntents[paymentId];
        if (!intent) {
          setPayment(null);
          setIsLoading(false);
          return;
        }
        
        // Determine the intent type
        const isWithdrawIntent = intent.fields?.type_?.includes('owned_intents::WithdrawAndTransferIntent');
        const intentType = isWithdrawIntent ? 
          'owned_intents::WithdrawAndTransferIntent' : 
          'pay::PayIntent';
        
        // Get display intents for this specific type
        const displayIntents = await getDisplayIntents(
          currentAccount.address,
          merchantId,
          { [paymentId]: intent },
          intentType
        );
        
        // Find our specific display intent
        const displayIntent = displayIntents[0];
        
        if (displayIntent) {
          const paymentDetail: PendingPayment = {
            id: displayIntent.key,
            intentKey: displayIntent.key,
            sender: displayIntent.creator,
            description: displayIntent.description,
            amount: displayIntent.amount,
            date: new Date(displayIntent.creationTime).toLocaleDateString(),
            time: new Date(displayIntent.creationTime).toLocaleTimeString(),
            status: 'pending',
            coinType: displayIntent.coinType,
            rawIntent: intent
          };
          
          // Only update state if component is still mounted
          if (isMounted) {
            setPayment(paymentDetail)
            
            // If it's a withdraw intent, check owner status and members
            if (isWithdrawIntent) {
              const ownerStatus = await isOwnerAddress(currentAccount.address, merchantId);
              const account = await getPaymentAccount(currentAccount.address, merchantId);
              
              if (isMounted) {
                setIsOwner(ownerStatus);
                setHasMultipleMembers(account.members.length > 1);
              }
            }
            
            // Check payment status
            const status = await getIntentStatus(currentAccount.address, paymentDetail.intentKey);
            if (isMounted) {
              setIntentStatus(status);
              
              // Debug info
              const debugInfo = {
                stage: status.stage,
                deletable: status.deletable,
                creationTime: intent.fields?.creationTime ? new Date(Number(intent.fields.creationTime)).toLocaleString() : 'N/A',
                expirationDuration: intent.fields?.expirationTime ? `${Number(intent.fields.expirationTime) / (1000 * 60 * 60)} hours` : 'N/A',
                expiresAt: intent.fields?.creationTime && intent.fields?.expirationTime ? 
                  new Date(Number(intent.fields.creationTime) + Number(intent.fields.expirationTime)).toLocaleString() : 'N/A',
                status: paymentDetail.status,
                type: intentType
              };
              setIntentInfo(JSON.stringify(debugInfo, null, 2));
            }
          }
        }
        
        setIsLoading(false)
      } catch (error) {
        // Only update state if component is still mounted
        if (isMounted) {
          console.log("Error fetching payment details, possibly deleted:", error)
          setPayment(null)
          setIsLoading(false)
        }
      }
    }

    fetchPaymentDetails()
    
    // Cleanup function to avoid state updates after unmount
    return () => {
      isMounted = false;
    }
  }, [currentAccount?.address, merchantId, paymentId, refreshCounter])

  const copyToClipboard = () => {
    if (payment?.rawIntent?.fields?.key) {
      navigator.clipboard.writeText(payment.rawIntent.fields.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  const handleDelete = async () => {
    if (!currentAccount?.address || !payment || !intentStatus?.deletable) {
      return;
    }
    
    try {
      setIsDeleting(true);
      
      // Create a new transaction
      const tx = new Transaction();
      
      // Set sender
      tx.setSender(currentAccount.address);
      
      // Stop the useEffect from running further
      const abortController = new AbortController();
      const signal = abortController.signal;
      
      try {
        // Delete the payment
        await deletePayment(
          currentAccount.address,
          merchantId,
          tx,
          payment.intentKey
        );
        
        // Execute transaction
        const txResult = await signAndExecute({
          suiClient,
          currentAccount,
          tx,
          signTransaction,
          toast
        }).catch(err => {
          if (err.message?.includes('User rejected')) {
            toast.error("Transaction canceled by user");
            setIsDeleting(false);
            return null;
          }
          throw err;
        });
        
        if (txResult) {
          handleTxResult(txResult, toast);
          
          // Cancel any ongoing fetch operations to prevent errors
          abortController.abort();
          
          // Reset client
          refreshClient();
          
          // Navigate back immediately - state updates will be cancelled by abort controller
          router.push(`/merchant/${merchantId}/pending`);
        } else {
          // If txResult is null (e.g. user rejected), ensure we reset the state
          setIsDeleting(false);
        }
      } catch (deleteError: any) {
        console.error("Error deleting payment:", deleteError);
        toast.error(deleteError.message || "Failed to delete payment");
        setIsDeleting(false);
      }
    } catch (error: any) {
      console.error("Error setting up deletion:", error);
      toast.error("Failed to set up deletion");
      setIsDeleting(false);
    }
  };

  const handleValidateWithdrawal = async () => {
    if (!currentAccount?.address || !payment) return;
    
    try {
      setIsValidating(true);
      
      // Create a new transaction
      const tx = new Transaction();
      
      // Call the completeWithdraw function
      await completeWithdraw(
        currentAccount.address,
        merchantId,
        tx,
        payment.intentKey
      );
      
      // Execute transaction
      const txResult = await signAndExecute({
        suiClient,
        currentAccount,
        tx,
        signTransaction,
        toast
      });
      
      if (txResult) {
        handleTxResult(txResult, toast);
        refreshClient();
        router.push(`/merchant/${merchantId}/pending`);
      }
    } catch (error: any) {
      console.error("Error validating withdrawal:", error);
      toast.error(error.message || "Failed to validate withdrawal");
    } finally {
      setIsValidating(false);
    }
  };

  // Format amount for display
  const formatAmount = (amount: string, coinType: string): string => {
    try {
      // Convert string amount to bigint
      const amountInMist = BigInt(amount);
      
      // Check if it's USDC (6 decimals) or SUI (9 decimals)
      const isUSDC = coinType.toLowerCase().includes('usdc');
      const decimals = isUSDC ? 6 : 9;
      
      // Format the amount based on decimals
      const formattedAmount = (Number(amountInMist) / Math.pow(10, decimals)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      // Extract coin symbol from coinType
      const coinSymbol = coinType.split('::').pop() || 'COIN';
      
      return `${formattedAmount} ${coinSymbol}`;
    } catch (e) {
      return `${amount} UNKNOWN`;
    }
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="animate-pulse bg-gray-800 h-[500px] rounded-lg"></div>
      </div>
    )
  }

  if (!payment) {
    return (
      <div className="w-full">
        <Card className="bg-[#2A2A2F] border-2 border-[#39393B]">
          <CardContent className="p-6">
            <p className="text-white text-center">Payment not found</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <Card className="bg-[#2A2A2F] border-2 border-[#39393B]">
      <CardContent className="pb-6 pt-4">
        {/* Show withdrawal-specific alerts */}
        {payment?.rawIntent?.fields?.type_?.includes('WithdrawAndTransferIntent') && (
          <div className="mb-6">
            {isOwner ? (
              <Alert variant="default" className="bg-blue-500/10 text-blue-500 border-blue-500/20">
                <AlertDescription>
                  As the owner of the payment account, you'll need to validate the withdrawal with a secondary address that has access to the payment account.
                  {!hasMultipleMembers && (
                    <div className="mt-2">
                      Don't have any secondary addresses?{' '}
                      <Link href={`/merchant/${merchantId}/profile/recovery`} className="underline">
                        Go set one
                      </Link>
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="default" className="bg-green-500/10 text-green-500 border-green-500/20">
                <AlertDescription>
                  You can validate the withdrawal as the secondary address
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Message</p>
        </div>
        <p className="text-white text-md mb-6">
          {payment?.rawIntent?.fields?.description || payment?.description || 'Payment'}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Amount</p>
        </div>
        <p className="text-white text-lg font-semibold mb-6">
          {formatAmount(payment.amount, payment.coinType)}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Status</p>
        </div>
        <p className={`text-md mb-6 ${payment.status === 'expired' ? 'text-amber-500' : 'text-white'}`}>
          {payment.status}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Date</p>
        </div>
        <p className="text-white text-md mb-6">
          {payment.rawIntent?.fields?.creationTime 
            ? new Date(Number(payment.rawIntent.fields.creationTime)).toLocaleString() 
            : `${payment.date} - ${payment.time}`}
        </p>
        
        {/* Only show link and QR code for regular payment intents */}
        {!payment.rawIntent?.fields?.type_?.includes('WithdrawAndTransferIntent') && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-md text-gray-400">Your Link</p>
              <button 
                onClick={copyToClipboard}
                className="p-1 rounded-full hover:bg-gray-700 text-[#78BCDB] relative flex-shrink-0"
              >
                {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                {copied && (
                  <span className="absolute bg-gray-700 text-white text-xs px-2 py-1 rounded top-[-30px] left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    Copied!
                  </span>
                )}
              </button>
            </div>
            <p className="text-[#78BCDB] font-mono text-sm break-all mb-6">
              {payment.rawIntent?.fields?.key || "No key available"}
            </p>
            
            <p className="text-md text-gray-400 mb-4">QR Code</p>
            <div className="flex justify-center mb-10">
              <div className="border border-[#737779] rounded-lg p-10 inline-block">
                <QRCodeSVG 
                  value={`${window.location.origin}/merchant/${merchantId}/pending/${payment.id}`} 
                  size={230}
                  bgColor="#2A2A2F"
                  fgColor="#FFFFFF"
                />
              </div>
            </div>
          </>
        )}

        {/* Add validation button for withdrawals if not owner */}
        {payment?.rawIntent?.fields?.type_?.includes('WithdrawAndTransferIntent') && !isOwner && (
          <div className="mt-6">
            <Button
              onClick={handleValidateWithdrawal}
              disabled={isValidating}
              className="w-full bg-green-500 hover:bg-green-600 text-white"
            >
              {isValidating ? "Validating..." : "Validate Withdrawal"}
            </Button>
          </div>
        )}

        {/* Show delete button for expired payments that are deletable */}
        {intentStatus?.deletable && (payment.status === 'expired') && (
          <div className="mt-4">
            <Button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full bg-red-500 hover:bg-red-600 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete Payment"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}