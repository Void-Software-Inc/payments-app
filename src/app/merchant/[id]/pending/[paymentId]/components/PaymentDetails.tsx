"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { usePaymentClient, PendingPayment } from "@/hooks/usePaymentClient"
import { usePaymentStore } from "@/store/usePaymentStore"
import { formatSuiBalance } from "@/utils/formatters"

interface PaymentDetailsProps {
  merchantId: string
  paymentId: string
}

export function PaymentDetails({ merchantId, paymentId }: PaymentDetailsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const { getPaymentDetail } = usePaymentClient()
  const { refreshTrigger } = usePaymentStore()
  
  const [payment, setPayment] = useState<PendingPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Only proceed if we have the wallet address
    if (!currentAccount?.address) {
      return;
    }
    
    const fetchPaymentDetails = async () => {
      setIsLoading(true)
      try {
        // Fetch real payment details
        const paymentDetail = await getPaymentDetail(
          currentAccount.address, 
          merchantId,
          paymentId
        )
        
        setPayment(paymentDetail)
      } catch (error) {
        console.error("Error fetching payment details:", error)
        setPayment(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPaymentDetails()
  }, [currentAccount?.address, merchantId, paymentId, refreshTrigger])

  const copyToClipboard = () => {
    if (payment?.intentKey) {
      const baseUrl = window.location.origin
      const paymentUrl = `${baseUrl}/merchant/${merchantId}/pending/${payment.id}`
      navigator.clipboard.writeText(paymentUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
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

  return (
    <Card className="bg-[#2A2A2F] border-2 border-[#39393B]">
      <CardContent className="pb-6 pt-4">
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Message</p>
        </div>
        <p className="text-white text-md mb-6">
          {payment.rawIntent?.fields?.description || payment.description || 'Payment'}
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
        <p className="text-white text-md mb-6">
          {payment.status}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Date</p>
        </div>
        <p className="text-white text-md mb-6">{payment.date} - {payment.time}</p>
        
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
          {payment.intentKey}
        </p>
        
        <p className="text-md text-gray-400 mb-4">QR Code</p>
        <div className="flex justify-center">
          <div className="border border-[#737779] rounded-lg p-10 inline-block">
            <QRCodeSVG 
              value={`${window.location.origin}/merchant/${merchantId}/pending/${payment.id}`} 
              size={230}
              bgColor="#2A2A2F"
              fgColor="#FFFFFF"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}