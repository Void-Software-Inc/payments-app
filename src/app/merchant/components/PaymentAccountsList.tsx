"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { usePaymentStore } from "@/store/usePaymentStore"
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { PlusCircle, ChevronRight, ChevronLeft } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { truncateMiddle } from "@/utils/formatters"

interface PaymentAccount {
  id: string
  name: string
}

interface PaymentAccountsListProps {
  onAccountsLoaded?: (count: number) => void;
}

export function PaymentAccountsList({ onAccountsLoaded }: PaymentAccountsListProps) {
  const [paymentAccounts, setPaymentAccounts] = useState<PaymentAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  const { getUserPaymentAccounts } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const pathname = usePathname()
  
  const accountsPerPage = 9
  const totalPages = Math.ceil(paymentAccounts.length / accountsPerPage)
  const startIndex = (currentPage - 1) * accountsPerPage
  const endIndex = startIndex + accountsPerPage
  const currentAccounts = paymentAccounts.slice(startIndex, endIndex)
  
  useEffect(() => {
    const fetchPaymentAccounts = async () => {
      if (!currentAccount?.address) {
        setIsLoading(false)
        return
      }
      
      try {
        setIsLoading(true)
        // Get payment accounts without calling refresh directly
        // The refresh is handled internally by the client when needed
        const accounts = await getUserPaymentAccounts(currentAccount.address)
        console.log("Fetched payment accounts:", accounts)
        setPaymentAccounts(accounts)
        
        // Reset to first page when accounts change
        setCurrentPage(1)
        
        // Notify parent component about the number of accounts
        onAccountsLoaded?.(accounts.length)
      } catch (err) {
        console.error("Error fetching payment accounts:", err)
        setError("Failed to load payment accounts")
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchPaymentAccounts()
  }, [currentAccount?.address, refreshCounter, pathname, onAccountsLoaded])
  
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
      <div className="mt-8 mb-20 flex justify-center">
        <Link href="/merchant/create">
          <Button 
            className="h-12 w-[220px] rounded-full flex items-center gap-2 font-medium hover:bg-[#78BCDB]/10" 
            style={{ backgroundColor: "#78BCDB", borderColor: "#78BCDB" }}
          >
            <PlusCircle className="h-4 w-4" />
            Create Merchant Account
          </Button>
        </Link>
      </div>
    )
  }
  
  return (
    <div className="flex flex-col mt-14">
      <div className="flex-grow">
        {paymentAccounts.length === 0 ? (
          <div className="text-center m-8 text-white p-2">No merchant accounts found</div>
        ) : (
          <>
            <div className={`grid gap-2 mb-8 ${
              currentAccounts.length < 3 
                ? 'grid-cols-1 md:flex md:justify-center md:gap-4' 
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
            }`}>
              {currentAccounts.map((account) => (
                <Link href={`/merchant/${account.id}`} key={account.id} className="block transition-transform hover:scale-[1.02]">
                  <div className="bg-[#212229] border border-[#33363A] rounded-md overflow-hidden h-full cursor-pointer hover:border-[#78BCDB] p-4 relative">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg text-white/80">{account.name}</h3>
                        <p className="text-base text-gray-400">ID: {truncateMiddle(account.id)}</p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mb-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="bg-[#2A2A2F] border-[#595C5F] text-white hover:bg-[#33363A]"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                <span className="text-white text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="bg-[#2A2A2F] border-[#595C5F] text-white hover:bg-[#33363A]"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
      {renderCreateButton()}
    </div>
  )
} 