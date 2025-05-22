"use client"

import { useEffect, useState } from "react"
import { useIntentStore } from "@/store/useIntentStore"
import { Intent } from "@account.tech/core"
import { useRouter } from "next/navigation"
import { CirclePlus, Clock, X, Search, ArrowUpDown } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface CompletedPaymentProps {
  merchantId: string
}

type StatusFilter = 'all' | 'completed';

export function AllCompletedPayments({ merchantId }: CompletedPaymentProps) {
  const router = useRouter()
  const [completedPayments, setCompletedPayments] = useState<Array<{
    intent: Intent;
    deletedAt: number;
    paymentId: string;
  }>>([])
  const [filteredPayments, setFilteredPayments] = useState<Array<{
    intent: Intent;
    deletedAt: number;
    paymentId: string;
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const { deletedIntents } = useIntentStore()

  useEffect(() => {
    setIsLoading(true)
    // Filter deleted intents for the current merchant
    const merchantCompletedPayments = deletedIntents.filter(
      (item) => item.intent.account === merchantId
    )
    setCompletedPayments(merchantCompletedPayments)
    setFilteredPayments(merchantCompletedPayments)
    setIsLoading(false)
  }, [deletedIntents, merchantId])

  // Filter payments when search term changes
  useEffect(() => {
    if (completedPayments.length === 0) {
      setFilteredPayments([]);
      return;
    }

    let filtered = [...completedPayments];

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.intent.fields.description?.toLowerCase().includes(term) || 
        payment.intent.fields.creator?.toLowerCase().includes(term) ||
        payment.paymentId.toLowerCase().includes(term)
      );
    }

    setFilteredPayments(filtered);
  }, [searchTerm, completedPayments]);

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
      
      // For USDC, just return $ amount. For others, include coin symbol
      if (isUSDC) {
        return `$${formattedAmount}`;
      } else {
        // Extract coin symbol from coinType
        const coinSymbol = coinType.split('::').pop() || 'COIN';
        return `${formattedAmount} ${coinSymbol}`;
      }
    } catch (e) {
      return `${amount} UNKNOWN`;
    }
  }

  const renderFilters = () => (
    <div className="flex flex-col gap-4 mb-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search payments..."
          className="pl-9 bg-[#1F1F23] border-[#3B3C3F] text-white"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          autoComplete="off"
        />
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="w-full lg:w-[70%] mx-auto mb-4">
        <div className="animate-pulse bg-gray-800 h-40 rounded-lg mb-4"></div>
        <div className="animate-pulse bg-gray-800 h-40 rounded-lg mb-4"></div>
        <div className="animate-pulse bg-gray-800 h-40 rounded-lg"></div>
      </div>
    )
  }

  if (completedPayments.length === 0) {
    return (
      <div className="w-full lg:w-[70%] mx-auto mb-4 pt-16">
        <div className="bg-[#2A2A2F] rounded-lg p-6">
          <p className="text-white text-center">No completed payments</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full lg:w-[70%] mx-auto">
      {renderFilters()}
      
      {filteredPayments.length === 0 ? (
        <div className="bg-[#2A2A2F] rounded-lg shadow-lg p-6">
          <p className="text-white text-center">No payments match your filters</p>
        </div>
      ) : (
        filteredPayments.map((payment, index) => (
          <div 
            key={payment.paymentId}
            className={`bg-[#2A2A2F] border-b-2 border-[#3B3C3F] hover:bg-[#33333A] transition-colors cursor-pointer p-3 ${
              index === 0 ? 'rounded-t-lg' : ''
            } ${
              index === filteredPayments.length - 1 ? 'rounded-b-lg border-b-0' : ''
            }`}
            onClick={() => router.push(`/merchant/${merchantId}/completed/${payment.paymentId}`)}
          >
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-10 h-14 mr-2 rounded-full flex items-center justify-center">
                  {payment.intent.fields.type_?.includes('WithdrawAndTransferIntent') ? (
                    <ArrowUpDown className="size-7 text-white" />
                  ) : (
                    <CirclePlus className="size-7 text-white" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between">
                  <div className="min-w-[150px] max-w-[150px] md:min-w-[250px] md:max-w-[250px]">
                    <h3 className="text-md text-white truncate">
                      {payment.intent.fields.description || 'Payment'}
                    </h3>
                    <p className="text-sm text-gray-400">
                      {formatDistanceToNow(new Date(payment.deletedAt), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right min-w-[98px] max-w-[98px] md:min-w-[250px] md:max-w-[250px]">
                    <p className="text-lg font-bold text-white truncate">
                      {payment.intent.fields.type_?.includes('WithdrawAndTransferIntent') ? '- ' : '+ '}
                      {formatAmount((payment.intent.args as any).amount, (payment.intent.args as any).coinType)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
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
