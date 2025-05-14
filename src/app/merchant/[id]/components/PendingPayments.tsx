"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CirclePlus } from "lucide-react"

interface PendingPayment {
  id: string
  sender: string
  amount: string
  date: string
  time: string
}

interface PendingPaymentsProps {
  merchantId: string
  limit?: number
}

export function PendingPayments({ merchantId, limit }: PendingPaymentsProps) {
  const router = useRouter()
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // In a real app, this would fetch actual pending payments from an API
    // For now, we'll use mock data
    const fetchPendingPayments = async () => {
      setIsLoading(true)
      try {
        // Mock data for demonstration
        const mockPayments: PendingPayment[] = [
          {
            id: "payment1",
            sender: "Julien",
            amount: "123378.23",
            date: "12.03.2025",
            time: "14:02:34"
          },
          {
            id: "payment2",
            sender: "Julien",
            amount: "1233.23",
            date: "12.03.2025",
            time: "14:02:34"
          },
          {
            id: "payment3",
            sender: "Eva",
            amount: "843.50",
            date: "14.03.2025",
            time: "09:15:22"
          }
        ]

        // Apply limit if specified
        const limitedPayments = limit ? mockPayments.slice(0, limit) : mockPayments
        setPendingPayments(limitedPayments)
      } catch (error) {
        console.error("Error fetching pending payments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingPayments()
  }, [limit])

  const handlePaymentClick = (paymentId: string) => {
    router.push(`/merchant/${merchantId}/pending/${paymentId}`)
  }

  if (isLoading) {
    return (
      <div className="w-full mb-4">
        <div className="animate-pulse bg-gray-800 h-40 rounded-lg"></div>
      </div>
    )
  }

  if (pendingPayments.length === 0) {
    return (
      <div className="w-full mb-4">
        <div className="bg-[#2A2A2F] rounded-lg shadow-lg p-6">
          <p className="text-white text-center">No pending payments</p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-white">Pending</h2>
            <Link 
            href={`/merchant/${merchantId}/pending`}
            className="text-[#77BBD9] hover:text-[#84d0f0] text-lg"
        >
          See All
        </Link>
      </div>
      {/* Progress bar */}
        <div className="w-full h-1 bg-[#3B3C3F] rounded-full mb-2">
            <div className="h-full bg-[#77BBD9] rounded-full w-[22%] md:w-[80px]" />
        </div>
      
      <div className="space-y-1">
        {pendingPayments.map((payment) => (
          <div 
            key={payment.id}
            className="bg-transparent hover:bg-[#33333A] transition-colors cursor-pointer py-2 border-b-2 border-[#3B3C3F]"
            onClick={() => handlePaymentClick(payment.id)}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-14 h-14 rounded-full flex items-center justify-center">
                  <CirclePlus className="size-7 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <div className="min-w-[170px] max-w-[170px] md:min-w-[250px] md:max-w-[250px]">
                    <h3 className="text-md text-white truncate">Payment from {payment.sender}</h3>
                    <p className="text-sm text-gray-400">{payment.date} - {payment.time}</p>
                  </div>
                  <div className="text-right min-w-[98px] max-w-[98px] md:min-w-[250px] md:max-w-[250px]">
                    <p className="text-lg font-bold text-white truncate">+ ${payment.amount}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 