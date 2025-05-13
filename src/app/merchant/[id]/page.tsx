"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Payment } from "@account.tech/payment";
import { usePaymentClient } from "@/hooks/usePaymentClient"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useSuiClient } from "@mysten/dapp-kit"
import { Toaster } from "sonner"
import { usePaymentStore } from "@/store/usePaymentStore"
import { BalanceCard } from "@/components/BalanceCard"
import { truncateMiddle } from "@/utils/formatters"
import { User } from "lucide-react"
import Link from "next/link"
import { getCoinDecimals } from "@/utils/helpers"
import { ActionButtons } from "@/components/ActionButtons"

// Define constants for coin types
const SUI_COIN_TYPE = "0x2::sui::SUI";
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

export default function PaymentAccountPage() {
  const params = useParams()
  const router = useRouter()
  const { getPaymentAccount } = usePaymentClient()
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const getOrInitClient = usePaymentStore(state => state.getOrInitClient);
  const [paymentAcc, setPaymentAcc] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0))
  const [balanceInUsdc, setBalanceInUsdc] = useState<bigint>(BigInt(0))
  
  const accountId = params.id as string
  
  useEffect(() => {
    const initPaymentClient = async () => {
      if (!currentAccount?.address) return;

      try {
        setIsLoading(true);
        const fetchingPaymentAccount = await getPaymentAccount(currentAccount.address, accountId);
        setPaymentAcc(fetchingPaymentAccount)
        
        // Fetch coins for the payment account
        if (fetchingPaymentAccount) {
          await fetchAccountCoins(fetchingPaymentAccount.id);
        }
      } catch (error) {
        console.error("Error initializing payment account:", error);
        setPaymentAcc(null)
      } finally {
        setIsLoading(false);
      }
    };

    initPaymentClient();
  }, [  getOrInitClient, suiClient]);

  // Fetch coins owned by the payment account
  const fetchAccountCoins = async (accountId: string) => {
    try {
      // Get all coins owned by the payment account
      const allCoinsResponse = await suiClient.getAllCoins({
        owner: accountId
      });
      
      // Calculate totals for SUI and USDC
      let totalSuiBalance = BigInt(0);
      let totalUsdcBalance = BigInt(0);
      
      for (const coin of allCoinsResponse.data) {
        if (coin.coinType === SUI_COIN_TYPE) {
          totalSuiBalance += BigInt(coin.balance);
        } else if (coin.coinType === USDC_COIN_TYPE) {
          totalUsdcBalance += BigInt(coin.balance);
        }
      }
      
      setBalanceInSui(totalSuiBalance);
      setBalanceInUsdc(totalUsdcBalance);
    } catch (error) {
      console.error("Failed to fetch account coins:", error);
    }
  };

  // Get account name from metadata
  const accountName = paymentAcc?.metadata?.find(item => item.key === "name")?.value || "Unnamed Account";
  
  if (isLoading) {
    return (
      <div className="w-full pt-20">
        <div className="container mx-auto px-4 py-0 max-w-2xl">
          <div className="flex justify-center p-8">Loading payment account...</div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="w-full pt-20">
        <div className="container mx-auto px-4 py-0 max-w-2xl">
          <div className="text-red-500 p-4">{error}</div>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => router.push("/merchant")}
          >
            Back to Payment Accounts
          </Button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="w-full pt-20">
      <div className="container mx-auto px-4 py-0 max-w-2xl">
        <Toaster position="bottom-center" richColors closeButton />
        <div className="mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">{accountName}</h1>
            <p className="text-zinc-200 ml-1 text-sm">ID: {truncateMiddle(accountId)}</p>
          </div>
        </div>
        
        {/* Balance Card with actual coin data */}
        <div className="mb-6">
          <BalanceCard 
            title="Account Balance" 
            accountId={accountId}
            customBalance={balanceInSui}
            customUsdcBalance={balanceInUsdc}
          />
        </div> 
      </div>
      <ActionButtons />
    </div>
  )
} 