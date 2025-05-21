"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CirclePlus, Clock, X, CheckCircle, Search, ArrowUpDown } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { usePaymentClient, PendingPayment, IntentStatus } from "@/hooks/usePaymentClient"
import { formatDistanceToNow } from "date-fns"
import { usePaymentStore } from "@/store/usePaymentStore"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import React from "react"

interface AllPendingPaymentsProps {
  merchantId: string
}

type StatusFilter = 'all' | 'pending' | 'executed' | 'expired';

export function AllPendingPayments({ merchantId }: AllPendingPaymentsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount();
  const { getFilteredIntents, getDisplayIntents, getIntentStatus } = usePaymentClient();
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [filteredPayments, setFilteredPayments] = useState<PendingPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Check payment status and update accordingly
  const checkPaymentStatus = async (payment: PendingPayment): Promise<PendingPayment> => {
    // Clone the payment to avoid direct mutations
    const updatedPayment = { ...payment };
    
    if (currentAccount?.address) {
      try {
        // Get payment status using the new getIntentStatus function
        const status = await getIntentStatus(currentAccount.address, payment.intentKey);
        
        // Check if the payment is actually expired by looking at timestamp
        let isExpired = false;
        if (payment.rawIntent?.fields?.expirationTime && payment.rawIntent?.fields?.creationTime) {
          const durationMs = Number(payment.rawIntent.fields.expirationTime);
          const creationTime = Number(payment.rawIntent.fields.creationTime);
          const expirationTimestamp = creationTime + durationMs;
          const now = Date.now();
          
          isExpired = now > expirationTimestamp;
        }
        
        // Update payment status based on intentStatus and expiration check
        if (status.stage === 'resolved') {
          updatedPayment.status = 'executed';
        } else if (isExpired) {
          // Only mark as expired if truly expired based on timestamps
          updatedPayment.status = 'expired';
        } else if (status.stage === 'executable' || status.stage === 'pending') {
          updatedPayment.status = 'pending';
        }
      } catch (error) {
        console.error("Error checking payment status:", error);
      }
    }
    
    return updatedPayment;
  }

  useEffect(() => {
    // Only proceed if we have the wallet address
    if (!currentAccount?.address) {
      return;
    }

    const fetchPendingPayments = async () => {
      setIsLoading(true)
      try {
        // Get all intents of both types
        const payIntents = await getFilteredIntents(currentAccount.address, merchantId);
        
        // Transform intents to display format
        const payDisplayIntents = await getDisplayIntents(
          currentAccount.address,
          merchantId,
          payIntents,
          'pay::PayIntent'
        );
        
        const withdrawDisplayIntents = await getDisplayIntents(
          currentAccount.address,
          merchantId,
          payIntents,
          'owned_intents::WithdrawAndTransferIntent'
        );
        
        // Combine both types of intents
        const allDisplayIntents = [...payDisplayIntents, ...withdrawDisplayIntents];
        
        // Convert to PendingPayment format and sort by date
        const paymentsArray = allDisplayIntents.map(intent => {
          // Get the original raw intent from our filtered intents
          const rawIntent = payIntents[intent.key];
          
          return {
            id: intent.key,
            intentKey: intent.key,
            sender: intent.creator,
            description: intent.description,
            amount: intent.amount,
            date: new Date(intent.creationTime).toLocaleDateString(),
            time: new Date(intent.creationTime).toLocaleTimeString(),
            status: 'pending', // We'll update this with checkPaymentStatus
            coinType: intent.coinType,
            rawIntent // This is now the original Intent type
          };
        });
        
        // Check status for each payment
        const updatedPaymentsPromises = paymentsArray.map(checkPaymentStatus);
        const updatedPaymentsArray = await Promise.all(updatedPaymentsPromises);
        
        // Sort by date (newest first)
        updatedPaymentsArray.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
        
        setPendingPayments(updatedPaymentsArray)
        setFilteredPayments(updatedPaymentsArray)
      } catch (error) {
        console.error("Error fetching pending payments:", error)
        setPendingPayments([])
        setFilteredPayments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingPayments()
  }, [currentAccount?.address, merchantId, refreshCounter])
  
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

  // Get relative time (e.g., "3 hours ago")
  const getRelativeTime = (dateStr: string, timeStr: string, rawIntent?: any): string => {
    try {
      // Try to form date from provided dateStr and timeStr first
      let date: Date;
      
      if (rawIntent?.fields?.creationTime) {
        // If creationTime is available in intent fields, use it (highest priority)
        date = new Date(Number(rawIntent.fields.creationTime));
      } else {
        // Otherwise fall back to the strings
        date = new Date(`${dateStr} ${timeStr}`);
      }
      
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      console.error("Error formatting date:", e);
      return `${dateStr} ${timeStr}`;
    }
  }

  // Get expiration time formatted
  const getExpirationTime = (rawIntent?: any): string | null => {
    if (!rawIntent?.fields?.expirationTime || !rawIntent?.fields?.creationTime) {
      return null;
    }
    
    try {
      const isWithdrawal = rawIntent?.fields?.type_?.includes('WithdrawAndTransferIntent');
      let expirationTimestamp: number;
      
      if (isWithdrawal) {
        // For withdrawals, expirationTime is already a timestamp in milliseconds
        expirationTimestamp = Number(rawIntent.fields.expirationTime);
      } else {
        // For other intents, expirationTime is a duration in milliseconds
        const durationMs = Number(rawIntent.fields.expirationTime);
        const creationTime = Number(rawIntent.fields.creationTime);
        expirationTimestamp = creationTime + durationMs;
      }
      
      const now = Date.now();
      const expirationDate = new Date(expirationTimestamp);
      
      // Use formatDistanceToNow for both expired and active payments
      return formatDistanceToNow(expirationDate, { addSuffix: true });
    } catch (e) {
      console.error("Error calculating expiration time:", e);
      return null;
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
          variant={statusFilter === 'expired' ? 'default' : 'outline'} 
          size="sm"
          className={statusFilter === 'expired' 
            ? 'bg-[#78BCDB] hover:bg-[#68ACCC] text-white' 
            : 'border-[#3B3C3F] bg-[#1F1F23] text-white'}
          onClick={() => setStatusFilter('expired')}
        >
          <X className="h-4 w-4 mr-1" /> Expired
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
                  {payment.status === 'expired' ? (
                    <X className="size-7 text-amber-500" />
                  ) : payment.rawIntent?.fields?.type_?.includes('WithdrawAndTransferIntent') ? (
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
                      {payment.rawIntent?.fields?.description || payment.description || 'Payment'}
                    </h3>
                    <p className="text-sm text-gray-400">{getRelativeTime(payment.date, payment.time, payment.rawIntent)}</p>
                    {payment.status === 'expired' && (
                      <p className="text-xs text-amber-500">Expired {getExpirationTime(payment.rawIntent)}</p>
                    )}
                  </div>
                  <div className="text-right min-w-[98px] max-w-[98px] md:min-w-[250px] md:max-w-[250px]">
                    <p className="text-lg font-bold text-white truncate">
                      {payment.rawIntent?.fields?.type_?.includes('WithdrawAndTransferIntent') ? '- ' : '+ '}
                      {formatAmount(payment.amount, payment.coinType)}
                    </p>
                    {payment.status === 'pending' && payment.rawIntent?.fields?.expirationTime && (
                      <p className="text-xs text-gray-400">Expires {getExpirationTime(payment.rawIntent)}</p>
                    )}
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