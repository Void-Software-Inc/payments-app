"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CirclePlus } from "lucide-react"

interface PendingPayment {
  id: string
  sender: string
  amount: string
  date: string
  time: string
}

interface AllPendingPaymentsProps {
  merchantId: string
}

export function AllPendingPayments({ merchantId }: AllPendingPaymentsProps) {
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
            amount: "1233.23",
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
          },
          {
            id: "payment4",
            sender: "Alexander",
            amount: "567.89",
            date: "15.03.2025",
            time: "16:45:10"
          },
          {
            id: "payment5",
            sender: "Sophie",
            amount: "1492.75",
            date: "16.03.2025",
            time: "10:22:48"
          }
        ]

        setPendingPayments(mockPayments)
      } catch (error) {
        console.error("Error fetching pending payments:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingPayments()
  }, [])

  const handlePaymentClick = (paymentId: string) => {
    router.push(`/merchant/${merchantId}/pending/${paymentId}`)
  }

  if (isLoading) {
    return (
      <div className="w-full lg:w-[70%] mx-auto mb-4">
        <div className="animate-pulse bg-gray-800 h-40 rounded-lg mb-4"></div>
        <div className="animate-pulse bg-gray-800 h-40 rounded-lg mb-4"></div>
        <div className="animate-pulse bg-gray-800 h-40 rounded-lg"></div>
      </div>
    )
  }

  if (pendingPayments.length === 0) {
    return (
      <div className="w-full lg:w-[70%] mx-auto mb-4">
        <div className="bg-[#2A2A2F] rounded-lg shadow-lg p-6">
          <p className="text-white text-center">No pending payments</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full lg:w-[70%] mx-auto">
      {pendingPayments.map((payment, index) => (
        <div 
          key={payment.id}
          className={`bg-[#2A2A2F] border-b-2 border-[#3B3C3F] hover:bg-[#33333A] transition-colors cursor-pointer p-3 ${
            index === 0 ? 'rounded-t-lg' : ''
          } ${
            index === pendingPayments.length - 1 ? 'rounded-b-lg border-b-0' : ''
          }`}
          onClick={() => handlePaymentClick(payment.id)}
        >
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-14 mr-2 rounded-full flex items-center justify-center">
                <CirclePlus className="size-7 text-white" />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <div className="min-w-[150px] max-w-[150px] md:min-w-[250px] md:max-w-[250px]">
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
      <div className="absolute bottom-[-2px] left-0 w-full h-[6px] pointer-events-none">
        <svg width="100%" height="6" preserveAspectRatio="none" viewBox="0 0 337 6" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g filter="url(#filter0_f_0_1004)">
            <ellipse cx="168.148" cy="2.51265" rx="167.148" ry="1.51265" fill="url(#paint0_linear_0_1004)"/>
          </g>
          <defs>
            <filter id="filter0_f_0_1004" x="0" y="0" width="336.296" height="5.02533" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
              <feFlood floodOpacity="0" result="BackgroundImageFix"/>
              <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
              <feGaussianBlur stdDeviation="0.5" result="effect1_foregroundBlur_0_1004"/>
            </filter>
            <linearGradient id="paint0_linear_0_1004" x1="1" y1="4.027" x2="335.297" y2="4.027" gradientUnits="userSpaceOnUse">
              <stop stopColor="#C1ECFF" stopOpacity="0"/>
              <stop offset="0.497804" stopColor="#C1ECFF"/>
              <stop offset="1" stopColor="#C1ECFF" stopOpacity="0"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  )
} 