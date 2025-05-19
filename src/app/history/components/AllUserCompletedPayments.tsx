"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { HandCoins, ArrowUpDown, Search } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useCompletedPayments, CompletedPayment } from "@/hooks/useCompletedPayments"
import { usePaymentStore } from "@/store/usePaymentStore"
import { formatDistanceToNow } from "date-fns"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import React from "react"

interface AllUserCompletedPaymentsProps {
  userAddress: string
}

type DirectionFilter = 'all' | 'received' | 'sent';

export function AllUserCompletedPayments({ userAddress }: AllUserCompletedPaymentsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const { getCompletedPaymentsByAccount, formatCoinAmount } = useCompletedPayments()
  const { refreshTrigger } = usePaymentStore()
  
  const [completedPayments, setCompletedPayments] = useState<CompletedPayment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<CompletedPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [directionFilter, setDirectionFilter] = useState<DirectionFilter>('all')

  useEffect(() => {
    if (!userAddress) {
      return;
    }

    const fetchCompletedPayments = async () => {
      setIsLoading(true)
      try {
        // Fetch completed payments for the user
        const payments = await getCompletedPaymentsByAccount(userAddress);
        
        // Sort by date (newest first)
        payments.sort((a, b) => {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        
        setCompletedPayments(payments)
        setFilteredPayments(payments)
      } catch (error) {
        console.error("Error fetching completed payments:", error)
        setCompletedPayments([])
        setFilteredPayments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchCompletedPayments()
  }, [userAddress, refreshTrigger])
  
  // Filter payments when search term or direction filter changes
  useEffect(() => {
    if (completedPayments.length === 0) {
      setFilteredPayments([]);
      return;
    }
    
    let filtered = [...completedPayments];
    
    // Apply direction filter
    if (directionFilter !== 'all') {
      filtered = filtered.filter(payment => {
        const isReceived = payment.issuedBy !== userAddress;
        return (directionFilter === 'received' && isReceived) || 
               (directionFilter === 'sent' && !isReceived);
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(payment => 
        payment.description?.toLowerCase().includes(term) || 
        payment.issuedBy.toLowerCase().includes(term) ||
        payment.paidBy.toLowerCase().includes(term) ||
        payment.paidAmount.includes(term) ||
        payment.paymentId.toLowerCase().includes(term)
      );
    }
    
    setFilteredPayments(filtered);
  }, [searchTerm, directionFilter, completedPayments.length, userAddress,
    // Use JSON.stringify to create a stable reference to completedPayments
    // but only consider the values we care about for filtering
    JSON.stringify(completedPayments.map(p => ({
      paymentId: p.paymentId,
      description: p.description,
      issuedBy: p.issuedBy,
      paidBy: p.paidBy,
      paidAmount: p.paidAmount
    })))
  ]);

  const handlePaymentClick = (paymentId: string) => {
    router.push(`/history/${paymentId}`)
  }

  // Get relative time (e.g., "3 hours ago")
  const getRelativeTime = (dateStr: string): string => {
    try {
      const date = new Date(dateStr);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateStr;
    }
  }

  const formatDate = (dateString: string): { date: string, time: string } => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
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
          variant={directionFilter === 'all' ? 'default' : 'outline'} 
          size="sm"
          className={directionFilter === 'all' 
            ? 'bg-[#78BCDB] hover:bg-[#68ACCC] text-white' 
            : 'border-[#3B3C3F] bg-[#1F1F23] text-white'}
          onClick={() => setDirectionFilter('all')}
        >
          All
        </Button>
        <Button 
          variant={directionFilter === 'received' ? 'default' : 'outline'} 
          size="sm"
          className={directionFilter === 'received' 
            ? 'bg-[#78BCDB] hover:bg-[#68ACCC] text-white' 
            : 'border-[#3B3C3F] bg-[#1F1F23] text-white'}
          onClick={() => setDirectionFilter('received')}
        >
          <HandCoins className="h-4 w-4 mr-1" /> Received
        </Button>
        <Button 
          variant={directionFilter === 'sent' ? 'default' : 'outline'} 
          size="sm"
          className={directionFilter === 'sent' 
            ? 'bg-[#78BCDB] hover:bg-[#68ACCC] text-white' 
            : 'border-[#3B3C3F] bg-[#1F1F23] text-white'}
          onClick={() => setDirectionFilter('sent')}
        >
          <ArrowUpDown className="h-4 w-4 mr-1" /> Sent
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

  if (completedPayments.length === 0) {
    return (
      <div className="w-full lg:w-[70%] mx-auto mb-4 pt-16">
        <div className="bg-[#2A2A2F] rounded-lg p-6">
          <p className="text-white text-center">No payment history</p>
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
        filteredPayments.map((payment, index) => {
          const formattedDate = formatDate(payment.createdAt);
          const isReceived = payment.issuedBy !== userAddress;
          
          return (
            <div 
              key={payment.id}
              className={`bg-[#2A2A2F] border-b-2 border-[#3B3C3F] hover:bg-[#33333A] transition-colors cursor-pointer p-3 ${
                index === 0 ? 'rounded-t-lg' : ''
              } ${
                index === filteredPayments.length - 1 ? 'rounded-b-lg border-b-0' : ''
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
                      <p className="text-sm text-gray-400">{getRelativeTime(payment.createdAt)}</p>
                    </div>
                    <div className="text-right min-w-[98px] max-w-[98px] md:min-w-[250px] md:max-w-[250px]">
                      <p className={`text-lg font-bold truncate ${isReceived ? 'text-white' : 'text-red-500'}`}>
                        {isReceived ? '+ ' : '- '}
                        {payment.coinType.toLowerCase().includes('usdc') 
                          ? '$' + formatCoinAmount(payment.paidAmount, payment.coinType).replace(' USDC', '')
                          : formatCoinAmount(payment.paidAmount, payment.coinType)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
      
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
  )
} 