"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUpRight, HandCoins, ArrowUpDown } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useCompletedPayments, CompletedPayment } from "@/hooks/useCompletedPayments"
import { truncateMiddle } from "@/utils/formatters"
import { Button } from "@/components/ui/button"

interface PaymentUserDetailsProps {
  userAddress: string
  paymentId: string
}

export function PaymentUserDetails({ userAddress, paymentId }: PaymentUserDetailsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const { formatCoinAmount } = useCompletedPayments()
  
  const [payment, setPayment] = useState<CompletedPayment | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/payments?paymentId=${paymentId}`)
        
        if (!response.ok) {
          throw new Error("Failed to fetch payment details")
        }
        
        const data = await response.json()
        if (data.success && data.data) {
          setPayment(data.data)
        } else {
          throw new Error("Payment not found")
        }
      } catch (error) {
        console.error("Error fetching payment details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    if (paymentId) {
      fetchPaymentDetails()
    }
  }, [paymentId])

  const openTransactionExplorer = () => {
    if (payment?.transactionHash) {
      window.open(`https://suiscan.xyz/testnet/tx/${payment.transactionHash}`, '_blank')
    }
  }

  // Check if the payment was received (not issued by the user) or sent (issued by the user)
  const isReceived = payment?.issuedBy !== userAddress

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

  // Format the date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString()
  }

  return (
    <Card className="bg-[#2A2A2F] border-2 border-[#39393B]">
      <CardContent className="pb-6 pt-4">
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Message</p>
        </div>
        <p className="text-white text-md mb-6">
          {payment.description || 'Payment'}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Amount</p>
        </div>
        <p className="text-white text-lg font-semibold mb-6">
          {isReceived ? '+ ' : '- '}
          {formatCoinAmount(payment.paidAmount, payment.coinType)}
        </p>
        
        {payment.tipAmount && Number(payment.tipAmount) > 0 && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-md text-gray-400">Tip</p>
            </div>
            <p className="text-white text-md mb-6">
              {formatCoinAmount(payment.tipAmount, payment.coinType)}
            </p>
          </>
        )}
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Status</p>
        </div>
        <p className="text-md mb-6 text-green-500">
          {isReceived ? 'Received' : 'Sent'}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Date</p>
        </div>
        <p className="text-white text-md mb-6">
          {formatDate(payment.createdAt)}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Issued By</p>
        </div>
        <p className="text-white text-md mb-6">
          {truncateMiddle(payment.issuedBy)}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Paid By</p>
        </div>
        <p className="text-white text-md mb-6">
          {truncateMiddle(payment.paidBy)}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Transaction ID</p>
        </div>
        <p className="text-[#78BCDB] font-mono text-sm break-all mb-6">
          {truncateMiddle(payment.paymentId, 12)}
        </p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Transaction Hash</p>
        </div>
        <p className="text-[#78BCDB] font-mono text-sm break-all mb-6">
          {truncateMiddle(payment.transactionHash, 12)}
        </p>
        
        <Button 
          className="mt-4 w-full h-12 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-md"
          onClick={openTransactionExplorer}
        >
          <ArrowUpRight className="size-6" />
          View on Explorer
        </Button>
      </CardContent>
    </Card>
  )
} 