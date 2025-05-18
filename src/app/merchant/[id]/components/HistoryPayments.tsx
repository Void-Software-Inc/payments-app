"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { HandCoins, ArrowUpDown } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useCompletedPayments, CompletedPayment } from "@/hooks/useCompletedPayments"
import { usePaymentStore } from "@/store/usePaymentStore"

interface HistoryPaymentsProps {
  merchantId: string
  limit?: number
}

export function HistoryPayments({ merchantId, limit }: HistoryPaymentsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const { getCompletedPaymentsByAccount, formatCoinAmount } = useCompletedPayments()
  const { refreshTrigger } = usePaymentStore()
  const [completedPayments, setCompletedPayments] = useState<CompletedPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Only proceed if we have the wallet address
    if (!merchantId) {
      return;
    }
    
    const fetchCompletedPayments = async () => {
      setIsLoading(true)
      try {
        // Fetch completed payments for the merchant
        const payments = await getCompletedPaymentsByAccount(merchantId);
        
        // Sort by date (newest first)
        payments.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        // Apply limit if specified
        const limitedPayments = limit ? payments.slice(0, limit) : payments;
        setCompletedPayments(limitedPayments)
      } catch (error) {
        console.error("Error fetching completed payments:", error)
        setCompletedPayments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompletedPayments()
  }, [merchantId, limit, refreshTrigger])

  const handlePaymentClick = (paymentId: string) => {
    router.push(`/merchant/${merchantId}/history/${paymentId}`)
  }

  const formatDate = (dateString: string): { date: string, time: string } => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  }

  // Always render the heading, link and progress bar
  return (
    <div className="w-full mt-10">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-white">History</h2>
        <Link 
          href={`/merchant/${merchantId}/history`}
          className="text-[#77BBD9] hover:text-[#84d0f0] text-lg"
        >
          See All
        </Link>
      </div>
      {/* Progress bar */}
      <div className="w-full h-1 bg-[#3B3C3F] rounded-full mb-2">
        <div className="h-full bg-[#77BBD9] rounded-full w-[22%] md:w-[80px]" />
      </div>
      
      {isLoading ? (
        <div className="w-full">
          <div className="animate-pulse bg-gray-800 h-40 rounded-lg"></div>
        </div>
      ) : completedPayments.length === 0 ? (
        <div className="bg-[#2A2A2F] rounded-lg p-6 mt-4">
          <p className="text-white text-center">No payment history</p>
        </div>
      ) : (
        <div className="relative">
          {completedPayments.map((payment, index) => {
            const formattedDate = formatDate(payment.createdAt);
            const isReceived = payment.issuedBy === merchantId;
            
            return (
              <div 
                key={payment.id}
                className={`bg-[#2A2A2F] border-b-2 border-[#3B3C3F] hover:bg-[#33333A] transition-colors cursor-pointer p-3 ${
                  index === 0 ? 'rounded-t-lg' : ''
                } ${
                  index === completedPayments.length - 1 ? 'rounded-b-lg border-b-0' : ''
                }`}
                onClick={() => handlePaymentClick(payment.paymentId)}
              >
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-14 mr-2 rounded-full flex items-center justify-center">
                      {isReceived ? (
                        <HandCoins className="size-7 text-white" />
                      ) : (
                        <ArrowUpDown className="size-7 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <div className="min-w-[150px] max-w-[150px] md:min-w-[250px] md:max-w-[250px]">
                        <h3 className="text-md text-white truncate">{payment.description || 'Payment'}</h3>
                        <p className="text-sm text-gray-400">{formattedDate.date} - {formattedDate.time}</p>
                      </div>
                      <div className="text-right min-w-[98px] max-w-[98px] md:min-w-[250px] md:max-w-[250px]">
                        <p className="text-lg font-bold text-white truncate">
                          {isReceived ? '+ ' : '- '}
                          {formatCoinAmount(payment.paidAmount, payment.coinType)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Bottom glow effect */}
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
      )}
    </div>
  )
} 