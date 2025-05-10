"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { usePaymentStore } from "@/store/usePaymentStore"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"

interface PaymentAccount {
  id: string
  name: string
}

export function PaymentAccountsList() {
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const { getOrInitClient, refreshTrigger } = usePaymentStore()
  const { getUserPaymentAccounts } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const pathname = usePathname()
  
  useEffect(() => {
    const fetchPaymentAccounts = async () => {
      if (!currentAccount?.address) {
        setIsLoading(false)
        return
      }
      
      try {
        setIsLoading(true)
        const client = await getOrInitClient(currentAccount.address)
        
        if (!client) {
          setError("Client not initialized")
          return
        }
        
        // Get payment accounts without calling refresh directly
        // The refresh is handled internally by the client when needed
        const accounts = await getUserPaymentAccounts(currentAccount.address)
        console.log("Fetched payment accounts:", accounts)
        setPaymentAccounts(accounts)
      } catch (err) {
        console.error("Error fetching payment accounts:", err)
        setError("Failed to load payment accounts")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPaymentAccounts()
  }, [currentAccount?.address, getOrInitClient, refreshTrigger, pathname])
  
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow flex justify-center items-center p-8">
          Loading payment accounts...
        </div>
        {renderCreateButton()}
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow text-red-500 p-4 text-center">{error}</div>
        {renderCreateButton()}
      </div>
    )
  }
  
  if (!currentAccount?.address) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-grow text-center p-4">
          Please connect your wallet to view payment accounts
        </div>
        {renderCreateButton()}
      </div>
    )
  }
  
  function renderCreateButton() {
    return (
      <div className="mt-8 flex justify-center">
        <Link href="/merchant/create">
          <Button 
            className="h-12 w-[220px] rounded-full flex items-center gap-2 font-medium hover:bg-[#78BCDB]/10" 
            style={{ backgroundColor: "#78BCDB", borderColor: "#78BCDB" }}
          >
            <PlusCircle className="h-4 w-4" />
            Create Payment Account
          </Button>
        </Link>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col">
      <div className="flex-grow">
        {paymentAccounts.length === 0 ? (
          <div className="text-center p-4 mb-8 text-white">No payment accounts found</div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mb-8">
            {paymentAccounts.map((account) => (
              <Link href={`/merchant/${account.id}`} key={account.id} className="block transition-transform hover:scale-[1.02]">
                <Card className="overflow-hidden h-full cursor-pointer hover:border-[#78BCDB]">
                  <CardHeader className="pb-2">
                    <CardTitle>{account.name}</CardTitle>
                    <CardDescription className="truncate">ID: {account.id}</CardDescription>
                  </CardHeader>
                  <CardContent>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
      {renderCreateButton()}
    </div>
  )
} 