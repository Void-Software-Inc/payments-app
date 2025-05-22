"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { CirclePlus, ArrowUpDown } from "lucide-react"
import { useIntentStore } from "@/store/useIntentStore"
import { PendingPayment as ClientPendingPayment, ExtendedIntentArgs } from "@/hooks/usePaymentClient"
import { Intent } from "@account.tech/core"

interface CompletedPaymentsProps {
  merchantId: string
  limit?: number
}

interface PendingPayment {
  id: string;
  intentKey: string;
  sender: string;
  description: string;
  amount: string;
  tip: string;
  date: string;
  time: string;
  status: string;
  coinType: string;
  rawIntent: Intent;
}

export function CompletedPayments({ merchantId, limit }: CompletedPaymentsProps) {
  const router = useRouter()
  const { deletedIntents } = useIntentStore()
  const [completedPayments, setCompletedPayments] = useState<ClientPendingPayment[]>([])

  useEffect(() => {
    // Filter and format deleted intents for this merchant
    const merchantPayments = deletedIntents
      .filter(item => {
        // Check if the intent has the merchant's account ID in paymentId field
        const merchantId = item.intent.account;
        return merchantId === merchantId;
      })
      .map(item => ({
        id: item.paymentId,
        intentKey: item.paymentId,
        sender: item.intent.fields?.creator || '',
        description: item.intent.fields?.description || '',
        amount: (item.intent.args as ExtendedIntentArgs)?.amount?.toString() || '0',
        date: new Date(item.deletedAt).toLocaleDateString(),
        time: new Date(item.deletedAt).toLocaleTimeString(),
        status: 'completed',
        coinType: (item.intent.args as ExtendedIntentArgs)?.coinType || 'usdc::USDC',
        rawIntent: item.intent
      }));

    // Sort by date (newest first)
    const sortedPayments = merchantPayments.sort((a, b) => {
      const dateA = new Date(`${a.date} ${a.time}`);
      const dateB = new Date(`${b.date} ${b.time}`);
      return dateB.getTime() - dateA.getTime();
    });

    // Apply limit if specified
    const limitedPayments = limit ? sortedPayments.slice(0, limit) : sortedPayments;
    setCompletedPayments(limitedPayments);
  }, [merchantId, deletedIntents]);

  const handlePaymentClick = (paymentId: string) => {
    router.push(`/merchant/${merchantId}/completed/${paymentId}`)
  }

  // Format amount with currency symbol based on coinType
  const formatAmount = (amount: string, coinType: string, tip?: string): string => {
    try {
      // Convert string amount to bigint
      const amountInMist = BigInt(amount);
      // Add tip if it exists
      const tipInMist = tip ? BigInt(tip) : BigInt(0);
      // Calculate total amount (amount + tip)
      const totalAmount = amountInMist + tipInMist;
      
      // Check if it's USDC (6 decimals) or SUI (9 decimals)
      const isUSDC = coinType.toLowerCase().includes('usdc');
      const decimals = isUSDC ? 6 : 9;
      
      // Format the amount based on decimals
      const formattedAmount = (Number(totalAmount) / Math.pow(10, decimals)).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      if (isUSDC) {
        const tipAmount = tip ? (Number(tipInMist) / Math.pow(10, decimals)).toFixed(2) : '0.00';
        return `$${formattedAmount} ${tipInMist > 0 ? `(+$${tipAmount} tip)` : ''}`;
      } else {
        const coinSymbol = coinType.split('::').pop() || 'COIN';
        return `${formattedAmount} ${coinSymbol}`;
      }
    } catch (e) {
      return `${amount} UNKNOWN`;
    }
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-white">Completed</h2>
        <Link 
          href={`/merchant/${merchantId}/completed`}
          className="text-[#77BBD9] hover:text-[#84d0f0] text-lg"
        >
          See All
        </Link>
      </div>
       {/* Progress bar */}
       <div className="w-full h-1 bg-[#3B3C3F] rounded-full mb-2">
        <div className="h-full bg-[#77BBD9] rounded-full w-[22%] md:w-[80px]" />
      </div>
      
      {completedPayments.length === 0 ? (
        <div className="bg-[#2A2A2F] rounded-lg p-6 mt-4">
          <p className="text-white text-center">No completed payments</p>
        </div>
      ) : (
        <div className="space-y-1">
          {completedPayments.map((payment) => (
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
                      <h3 className="text-md text-white truncate">{payment.description || 'Payment'}</h3>
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
