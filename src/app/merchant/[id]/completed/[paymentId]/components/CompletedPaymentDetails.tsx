"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, ArrowUpDown, CirclePlus } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useIntentStore } from "@/store/useIntentStore"
import { formatDistanceToNow } from "date-fns"

interface CompletedPaymentDetailsProps {
  merchantId: string
  paymentId: string
}

export function CompletedPaymentDetails({ merchantId, paymentId }: CompletedPaymentDetailsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const getDeletedIntent = useIntentStore((state) => state.getDeletedIntent)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [payment, setPayment] = useState<any>(null)

  useEffect(() => {
    if (!currentAccount?.address) {
      return;
    }

    let isMounted = true;
    const fetchPaymentDetails = async () => {
      setIsLoading(true)
      try {
        const deletedIntent = getDeletedIntent(paymentId)
        if (deletedIntent && isMounted) {
          setPayment(deletedIntent)
        }
      } catch (error) {
        console.error("Error fetching completed payment details:", error)
        if (isMounted) {
          setPayment(null)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchPaymentDetails()
    return () => {
      isMounted = false
    }
  }, [currentAccount?.address, paymentId, getDeletedIntent])

  const copyToClipboard = () => {
    if (payment?.intent?.fields?.key) {
      const paymentLink = `${merchantId}/${payment.intent.fields.key}`;
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  const getTruncatedLink = (key: string) => {
    if (key.length <= 20) return key;
    return `${key.slice(0, 10)}...${key.slice(-10)}`;
  }

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

  const isWithdrawal = payment.intent.fields?.type_?.includes('WithdrawAndTransferIntent');

  return (
    <Card className="bg-[#2A2A2F] border-2 border-[#39393B] p-0">
      <CardContent className="pb-6 pt-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <div className="w-10 h-10 mr-3 rounded-full flex items-center justify-center">
              {isWithdrawal ? (
                <ArrowUpDown className="size-7 text-white" />
              ) : (
                <CirclePlus className="size-7 text-white" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Completed Payment</h2>
              <p className="text-gray-400">
                {formatDistanceToNow(new Date(payment.deletedAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Message</p>
        </div>
        <p className="text-white text-md mb-6">
          {payment.intent.fields?.description || 'Payment'}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Amount</p>
        </div>
        <p className="text-white text-lg font-semibold mb-6">
          {isWithdrawal ? '- ' : '+ '}
          {formatAmount((payment.intent.args as any).amount, (payment.intent.args as any).coinType)}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Status</p>
        </div>
        <p className="text-white text-md mb-6">
          Completed
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Completed At</p>
        </div>
        <p className="text-white text-md mb-6">
          {new Date(payment.deletedAt).toLocaleString()}
        </p>
        
        {!isWithdrawal && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-md text-gray-400">Payment Link</p>
              <button 
                onClick={copyToClipboard}
                className="p-1 rounded-full hover:bg-gray-700 text-[#78BCDB] relative flex-shrink-0"
                title="Copy full link"
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
              {payment.intent.fields?.key 
                ? `${merchantId.slice(0, 6)}.../${getTruncatedLink(payment.intent.fields.key)}`
                : "No key available"}
            </p>
            
            <p className="text-md text-gray-400 mb-4">QR Code</p>
            <div className="flex justify-center mb-10">
              <div className="border border-[#737779] rounded-lg p-10 inline-block">
                <QRCodeSVG 
                  value={`${window.location.origin}/merchant/${merchantId}/completed/${payment.paymentId}`} 
                  size={230}
                  bgColor="#2A2A2F"
                  fgColor="#FFFFFF"
                />
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
