"use client"

import { useState, useEffect } from "react"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { Card, CardContent } from "@/components/ui/card"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { formatDistanceToNow } from "date-fns"

interface WithdrawIntentsProps {
  merchantId: string
}

interface IntentData {
  key: string;
  intent: string;
  fields?: {
    creationTime?: string;
    status?: string;
    [key: string]: any;
  };
  args?: {
    amount?: string;
    recipient?: string;
    [key: string]: any;
  };
  withdrawAmount?: {
    id: string;
    amount: string;
  };
}

export function WithdrawIntents({ merchantId }: WithdrawIntentsProps) {
  const [allIntents, setAllIntents] = useState<IntentData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const currentAccount = useCurrentAccount()
  const { getIntents, getWithdrawIntentAmounts } = usePaymentClient()

  useEffect(() => {
    const fetchIntents = async () => {
      if (!currentAccount?.address) return

      try {
        setIsLoading(true)
        const intents = await getIntents(currentAccount.address, merchantId)
        
        // Map all intents and fetch withdraw amounts
        const intentsList = await Promise.all(
          Object.entries(intents || {})
            .map(async ([key, intent]: [string, any]) => {
              // Fetch withdraw amount for each intent
              const withdrawAmount = await getWithdrawIntentAmounts(currentAccount.address, merchantId)
              
              return {
                key,
                intent: intent.intent,
                fields: intent.fields,
                args: intent.args,
                withdrawAmount
              } as IntentData;
            })
        );

        // Sort by timestamp (newest first)
        const sortedIntents = intentsList.sort((a, b) => {
          const timeA = a.fields?.creationTime ? Number(a.fields.creationTime) : 0
          const timeB = b.fields?.creationTime ? Number(b.fields.creationTime) : 0
          return timeB - timeA
        });
        
        setAllIntents(sortedIntents)
        
      } catch (error) {
        console.error("Error fetching intents:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchIntents()
  }, [currentAccount, merchantId])

  // Format amount for display
  const formatAmount = (amount: string, decimals: number = 6): string => {
    try {
      const amountValue = parseInt(amount)
      const formatted = (amountValue / Math.pow(10, decimals)).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
      return `$${formatted}`
    } catch (e) {
      return amount
    }
  }

  // Get relative time
  const getRelativeTime = (timestamp: number): string => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true })
    } catch (e) {
      return 'Unknown time'
    }
  }

  if (isLoading) {
    return (
      <Card className="bg-[#2A2A2F] border-none shadow-lg w-full my-4">
        <CardContent className="pt-6">
          <h2 className="text-xl font-semibold text-white mb-4">Pending Intents</h2>
          <div className="animate-pulse bg-gray-800 h-20 rounded-lg mb-2"></div>
          <div className="animate-pulse bg-gray-800 h-20 rounded-lg"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#2A2A2F] border-none shadow-lg w-full my-4">
      <CardContent className="pt-6">
        <h2 className="text-xl font-semibold text-white mb-4">All Pending Intents</h2>
        
        {allIntents.length === 0 ? (
          <p className="text-center text-gray-400 py-4">No intents found</p>
        ) : (
          <div className="space-y-2">
            {allIntents.map((intent) => (
              <div key={intent.key} className="p-3 border border-gray-700 rounded-lg">
                <div className="flex justify-between">
                  <div>
                    {intent.withdrawAmount && (
                      <p className="text-white">
                        {formatAmount(intent.withdrawAmount.amount)}
                      </p>
                    )}
                    {intent.args?.recipient && (
                      <p className="text-xs text-gray-400">
                        To: {intent.args.recipient.slice(0, 6)}...{intent.args.recipient.slice(-4)}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`text-sm ${intent.fields?.status === "completed" ? "text-green-400" : "text-amber-400"}`}>
                      {intent.fields?.status || "Pending"}
                    </p>
                    {intent.fields?.creationTime && (
                      <p className="text-xs text-gray-400">{getRelativeTime(Number(intent.fields.creationTime))}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
} 