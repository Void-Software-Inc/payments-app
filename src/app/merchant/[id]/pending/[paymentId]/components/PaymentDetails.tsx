"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { QRCodeSVG } from 'qrcode.react'
import { Copy } from "lucide-react"

interface PaymentDetail {
  id: string
  sender: string
  amount: string
  date: string
  time: string
  status: string
  link?: string
  description?: string
}

interface PaymentDetailsProps {
  merchantId: string
  paymentId: string
}

export function PaymentDetails({ merchantId, paymentId }: PaymentDetailsProps) {
  const router = useRouter()
  const [payment, setPayment] = useState<PaymentDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // In a real app, this would fetch the specific payment from an API
    const fetchPaymentDetails = async () => {
      setIsLoading(true)
      try {
        // Mock data for demonstration
        const mockPayment: PaymentDetail = {
          id: paymentId,
          sender: "Julien",
          amount: "1233.23",
          date: "12.03.2025",
          time: "14:02:34",
          status: "pending",
          link: "suipay/d4bxjkdjdn",
          description: "Payment for services rendered"
        }

        setPayment(mockPayment)
      } catch (error) {
        console.error("Error fetching payment details:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPaymentDetails()
  }, [paymentId])

  const copyToClipboard = () => {
    if (payment?.link) {
      navigator.clipboard.writeText(payment.link)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    }
  }

  if (isLoading) {
    return (
      <div className="w-full">
        <div className="animate-pulse bg-gray-800 h-screen rounded-lg"></div>
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
      <CardContent className="pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Message</p>
        </div>
        <p className="text-white text-md mb-6">Payment from {payment.sender}</p>
        
        <div className="flex items-center justify-between mb-1">
          <p className="text-md text-gray-400">Date</p>
        </div>
        <p className="text-white text-md mb-6">{payment.date} - {payment.time}</p>
        
        {payment.link && (
          <>
            <div className="flex items-center justify-between mb-1">
              <p className="text-md text-gray-400">Your Link</p>
              <button 
                onClick={copyToClipboard}
                className="p-1 rounded-full hover:bg-gray-700 text-[#78BCDB] relative flex-shrink-0"
              >
                <Copy className="h-5 w-5" />
                {copied && (
                  <span className="absolute bg-gray-700 text-white text-xs px-2 py-1 rounded top-[-30px] left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    Copied!
                  </span>
                )}
              </button>
            </div>
            <p className="text-[#78BCDB] font-mono text-sm break-all mb-6">
              {payment.link}
            </p>
          </>
        )}
        
        <p className="text-md text-gray-400 mb-4">QR Code</p>
        <div className="flex justify-center">
          <div className="border border-[#737779] rounded-lg p-10 inline-block">
            <QRCodeSVG 
              value={payment.link || `payment:${paymentId}`} 
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