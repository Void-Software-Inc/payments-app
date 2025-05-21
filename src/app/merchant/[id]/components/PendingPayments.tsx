"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CirclePlus, ArrowUpDown } from "lucide-react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { usePaymentClient, PendingPayment as ClientPendingPayment } from "@/hooks/usePaymentClient"
import { usePaymentStore } from "@/store/usePaymentStore"

interface PendingPaymentsProps {
  merchantId: string
  limit?: number
}

export function PendingPayments({ merchantId, limit }: PendingPaymentsProps) {
  const router = useRouter()
  const currentAccount = useCurrentAccount()
  const { getFilteredIntents, getDisplayIntents } = usePaymentClient()
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  const [pendingPayments, setPendingPayments] = useState<ClientPendingPayment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Check if a payment is expired based on expirationTime and creationTime
  const checkPaymentExpiration = (payment: ClientPendingPayment): boolean => {
    if (payment.rawIntent?.fields?.expirationTime && payment.rawIntent?.fields?.creationTime) {
      const durationMs = Number(payment.rawIntent.fields.expirationTime);
      const creationTime = Number(payment.rawIntent.fields.creationTime);
      const expirationTimestamp = creationTime + durationMs;
      const now = Date.now();
      
      return now > expirationTimestamp;
    }
    return false;
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
        
        // Convert to PendingPayment format
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
            status: 'pending',
            coinType: intent.coinType,
            rawIntent
          };
        });

        // Filter out expired payments
        const activePayments = paymentsArray.filter(payment => 
          !checkPaymentExpiration(payment) && payment.status === 'pending'
        );
        
        // Sort by date (newest first)
        activePayments.sort((a, b) => {
          const dateA = new Date(`${a.date} ${a.time}`);
          const dateB = new Date(`${b.date} ${b.time}`);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Apply limit if specified
        const limitedPayments = limit ? activePayments.slice(0, limit) : activePayments;
        setPendingPayments(limitedPayments)
      } catch (error) {
        console.error("Error fetching pending payments:", error)
        setPendingPayments([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchPendingPayments()
  }, [currentAccount?.address, merchantId, limit, refreshCounter])

  const handlePaymentClick = (paymentId: string) => {
    router.push(`/merchant/${merchantId}/pending/${paymentId}`)
  }

  // Format amount with currency symbol based on coinType
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

  // Always render the heading, link and progress bar
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
      
      {isLoading ? (
        <div className="w-full">
          <div className="animate-pulse bg-gray-800 h-40 rounded-lg"></div>
        </div>
      ) : pendingPayments.length === 0 ? (
        <div className="bg-[#2A2A2F] rounded-lg p-6 mt-4">
          <p className="text-white text-center">No pending payments</p>
        </div>
      ) : (
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
                    {payment.rawIntent?.fields?.type_?.includes('WithdrawAndTransferIntent') ? (
                      <ArrowUpDown className="size-7 text-white" />
                    ) : (
                      <CirclePlus className="size-7 text-white" />
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between">
                    <div className="min-w-[170px] max-w-[170px] md:min-w-[250px] md:max-w-[250px]">
                      <h3 className="text-md text-white truncate">{payment.rawIntent?.fields?.description || payment.description || 'Payment'}</h3>
                      <p className="text-sm text-gray-400">{payment.date} - {payment.time}</p>
                    </div>
                    <div className="text-right min-w-[98px] max-w-[98px] md:min-w-[250px] md:max-w-[250px]">
                      <p className="text-lg font-bold text-white truncate">
                        {payment.rawIntent?.fields?.type_?.includes('WithdrawAndTransferIntent') ? '- ' : '+ '}
                        {formatAmount(payment.amount, payment.coinType)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 