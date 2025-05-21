"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount, useSignTransaction } from "@mysten/dapp-kit"
import { useSuiClient } from "@mysten/dapp-kit"
import { Toaster } from "sonner"
import { Transaction } from "@mysten/sui/transactions"
import { WithdrawForm } from "./components/WithdrawForm"
import { WithdrawStatus } from "./components/WithdrawStatus"
import { ActionButtonsMerchant } from "@/app/merchant/components/ActionButtonsMerchant"

export default function WithdrawPage() {
  const params = useParams()
  const { getPaymentAccount } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const [account, setAccount] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  const [isBackup, setIsBackup] = useState(false)
  const [pendingWithdraws, setPendingWithdraws] = useState<Record<string, any>>({})
  
  const accountId = params.id as string
  
  useEffect(() => {
    const loadAccount = async () => {
      if (!currentAccount?.address) return

      try {
        setIsLoading(true)
        const paymentAcc = await getPaymentAccount(currentAccount.address, accountId)
        setAccount(paymentAcc)
        
        // Check if current user is owner (index 0) or backup (index 1)
        if (paymentAcc?.members?.length > 0) {
          // Convert member addresses to strings for comparison
          const memberAddresses = paymentAcc.members.map((member: any) => 
            typeof member === 'string' ? member : member.id || member.address || ''
          )
          setIsOwner(memberAddresses[0] === currentAccount.address)
          setIsBackup(memberAddresses.length > 1 && memberAddresses[1] === currentAccount.address)
        }
        
        // Load pending withdraws from client intents
        // Use optional chaining and assume any type to avoid type errors
        const clientIntents = (paymentAcc as any)?.client?.intents?._intents || {}
        const withdraws = Object.entries(clientIntents)
          .filter(([key, intent]: [string, any]) => intent.intent === "withdraw")
          .reduce((acc, [key, intent]) => ({ ...acc, [key]: intent }), {})
          
        setPendingWithdraws(withdraws)
      } catch (error) {
        console.error("Error loading account:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAccount()
  }, [currentAccount, accountId])

  if (isLoading) {
    return <div className="container mx-auto p-8 text-center">Loading...</div>
  }

  return (
    <div className="w-full h-dvh overflow-y-auto">
      <div className="w-full pt-20 pb-24 flex flex-col items-center">
        <div className="w-[90%] h-full">
          <div className="container mx-auto py-0 max-w-2xl">
            <Toaster position="bottom-center" richColors closeButton />
            <h1 className="text-2xl font-bold text-white mb-6">Withdraw Funds</h1>
            
            <WithdrawStatus 
              isOwner={isOwner}
              isBackup={isBackup}
              pendingWithdraws={pendingWithdraws}
              account={account}
            />
            
            <WithdrawForm 
              accountId={accountId}
              isOwner={isOwner}
              isBackup={isBackup}
              pendingWithdraws={pendingWithdraws}
            />
          </div>
        </div>
      </div>
      <ActionButtonsMerchant />
    </div>
  )
}
