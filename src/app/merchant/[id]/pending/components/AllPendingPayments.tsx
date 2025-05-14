"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CirclePlus, Clock, X, CheckCircle, Search } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { usePaymentClient, PendingPayment } from "@/hooks/usePaymentClient"
import { formatDistanceToNow } from "date-fns"
import { usePaymentStore } from "@/store/usePaymentStore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import React from "react"

interface AllPendingPaymentsProps {
  merchantId: string
}

type StatusFilter = 'all' | 'pending' | 'executed' | 'rejected' | 'expired';

export function AllPendingPayments({ merchantId }: AllPendingPaymentsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount();
  const { getPendingPayments } = usePaymentClient();
  const { refreshTrigger } = usePaymentStore();
  
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<PendingPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    // Only proceed if we have the wallet address
    if (!currentAccount?.address) {
      return;
    }

    const fetchPendingPayments = async () => {
      setIsLoading(true)
      try {
        // Fetch real pending payments from the payment client
        const paymentsRecord = await getPendingPayments(currentAccount.address, merchantId);
        
        // Convert the record to an array and sort by date (newest first)
        const paymentsArray = Object.values(paymentsRecord);
        paymentsArray.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
        
        setPendingPayments(paymentsArray)
        setFilteredPayments(paymentsArray)
      } catch (error) {
        console.error("Error fetching pending payments:", error)
        setPendingPayments([])
        setFilteredPayments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingPayments()
  }, [currentAccount?.address, merchantId])
  
  // Filter payments when search term or status filter changes
  useEffect(() => {
    if (pendingPayments.length === 0) {
      setFilteredPayments([]);
      return;
    }
    
    let filtered = [...pendingPayments];
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(payment => 
        payment.status.toLowerCase() === statusFilter
      );
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.description?.toLowerCase().includes(term) || 
        payment.sender?.toLowerCase().includes(term) ||
        payment.amount.includes(term) ||
        payment.id.toLowerCase().includes(term)
      );
    }
    
    setFilteredPayments(filtered);
  }, [searchTerm, statusFilter, pendingPayments.length, 
    // Use JSON.stringify to create a stable reference to pendingPayments
    // but only consider the values we care about for filtering
    JSON.stringify(pendingPayments.map(p => ({
      id: p.id,
      description: p.description,
      sender: p.sender,
      amount: p.amount,
      status: p.status
    })))
  ]);

  const handlePaymentClick = (paymentId: string) => {
    router.push(`/merchant/${merchantId}/pending/${paymentId}`)
  }

  // Format amount for display
  const formatAmount = (amount: string, coinType: string): string => {
    try {
      // Parse amount as a number
      const numAmount = parseFloat(amount);
      
      // Format with 2 decimal places
      const formattedAmount = numAmount.toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      // Extract coin symbol from coinType (e.g., "0x2::sui::SUI" -> "SUI")
      const coinSymbol = coinType.split('::').pop() || 'COIN';
      
      return `${formattedAmount} ${coinSymbol}`;
    } catch (e) {
      return `${amount} UNKNOWN`;
    }
  }

  // Get relative time (e.g., "3 hours ago")
  const getRelativeTime = (dateStr: string, timeStr: string): string => {
    try {
      const date = new Date(`${dateStr} ${timeStr}`);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return `${dateStr} ${timeStr}`;
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
        />
      </div>
      
      <div className="flex flex-wrap gap-2">
        <Button 
          variant={statusFilter === 'all' ? 'default' : 'outline'} 
          size="sm"
          className={statusFilter === 'all' 
            ? 'bg-[#78BCDB] hover:bg-[#68ACCC] text-white' 
            : 'border-[#3B3C3F] bg-[#1F1F23] text-white'}
          onClick={() => setStatusFilter('all')}
        >
          All
        </Button>
        <Button 
          variant={statusFilter === 'pending' ? 'default' : 'outline'} 
          size="sm"
          className={statusFilter === 'pending' 
            ? 'bg-[#78BCDB] hover:bg-[#68ACCC] text-white' 
            : 'border-[#3B3C3F] bg-[#1F1F23] text-white'}
          onClick={() => setStatusFilter('pending')}
        >
          <Clock className="h-4 w-4 mr-1" /> Pending
        </Button>
        <Button 
          variant={statusFilter === 'executed' ? 'default' : 'outline'} 
          size="sm"
          className={statusFilter === 'executed' 
            ? 'bg-[#78BCDB] hover:bg-[#68ACCC] text-white' 
            : 'border-[#3B3C3F] bg-[#1F1F23] text-white'}
          onClick={() => setStatusFilter('executed')}
        >
          <CheckCircle className="h-4 w-4 mr-1" /> Completed
        </Button>
        <Button 
          variant={statusFilter === 'rejected' ? 'default' : 'outline'} 
          size="sm"
          className={statusFilter === 'rejected' 
            ? 'bg-[#78BCDB] hover:bg-[#68ACCC] text-white' 
            : 'border-[#3B3C3F] bg-[#1F1F23] text-white'}
          onClick={() => setStatusFilter('rejected')}
        >
          <X className="h-4 w-4 mr-1" /> Rejected
        </Button>
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

  if (pendingPayments.length === 0) {
    return (
      <div className="w-full lg:w-[70%] mx-auto mb-4 pt-16">
        <div className="bg-[#2A2A2F] rounded-lg p-6">
          <p className="text-white text-center">No pending payments</p>
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
            key={payment.id}
            className={`bg-[#2A2A2F] border-b-2 border-[#3B3C3F] hover:bg-[#33333A] transition-colors cursor-pointer p-3 ${
              index === 0 ? 'rounded-t-lg' : ''
            } ${
              index === filteredPayments.length - 1 ? 'rounded-b-lg border-b-0' : ''
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
                    <h3 className="text-md text-white truncate">
                      {payment.description || `Payment from ${payment.sender}`}
                    </h3>
                    <p className="text-sm text-gray-400">{getRelativeTime(payment.date, payment.time)}</p>
                  </div>
                  <div className="text-right min-w-[98px] max-w-[98px] md:min-w-[250px] md:max-w-[250px]">
                    <p className="text-lg font-bold text-white truncate">+ {formatAmount(payment.amount, payment.coinType)}</p>
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