"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { WithdrawForm } from "./components/WithdrawForm"
import { WithdrawStatus } from "./components/WithdrawStatus"
import { ActionButtonsMerchant } from "@/app/merchant/components/ActionButtonsMerchant"
import { usePaymentStore } from "@/store/usePaymentStore"

export default function WithdrawPage() {
  const params = useParams()
  const { getPaymentAccount, isOwnerAddress } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  const [account, setAccount] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOwner, setIsOwner] = useState(false)
  
  const accountId = params.id as string
  
  useEffect(() => {
    const loadAccount = async () => {
      if (!currentAccount?.address) return

      try {
        setIsLoading(true)
        const paymentAcc = await getPaymentAccount(currentAccount.address, accountId)
        setAccount(paymentAcc)
        
        // Check if current user is owner using helper
        const ownerStatus = await isOwnerAddress(currentAccount.address, accountId)
        setIsOwner(ownerStatus)
      } catch (error) {
        console.error("Error loading account:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAccount()
  }, [currentAccount, accountId, refreshCounter])

  if (isLoading) {
    return <div className="container mx-auto p-8 text-center">Loading...</div>
  }

  return (
    <div className="w-full h-dvh overflow-y-auto">
      <div className="w-full pt-20 pb-24 flex flex-col items-center">
        <div className="w-[90%] h-full">
          <div className="container mx-auto py-0 max-w-2xl">
            <h1 className="text-2xl font-bold text-white mb-6">Withdraw Funds</h1>
            
            <WithdrawStatus 
              isOwner={isOwner}
              account={account}
            />
            
            <WithdrawForm 
              accountId={accountId}
              isOwner={isOwner}
            />
          </div>
        </div>
      </div>
      <ActionButtonsMerchant />
    </div>
  )
}
