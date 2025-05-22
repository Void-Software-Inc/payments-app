"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CirclePlus, ArrowUpDown } from "lucide-react"
import { useIntentStore } from "@/store/useIntentStore"
import { PendingPayment as ClientPendingPayment, ExtendedIntentArgs } from "@/hooks/usePaymentClient"

interface CompletedPaymentsProps {
  merchantId: string
  limit?: number
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
      
      if (isUSDC) {
        return `$${formattedAmount}`;
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
