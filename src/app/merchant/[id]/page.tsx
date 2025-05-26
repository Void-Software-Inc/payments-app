"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Payment } from "@account.tech/payment";
import { usePaymentClient, DepStatus } from "@/hooks/usePaymentClient"
import { useCurrentAccount } from "@mysten/dapp-kit"
import { useSuiClient } from "@mysten/dapp-kit"
import { BalanceCard } from "@/components/BalanceCard"
import { truncateMiddle } from "@/utils/formatters"
import { ActionButtonsMerchant } from "@/app/merchant/components/ActionButtonsMerchant"
import { PendingPayments } from "./components/PendingPayments"
import { usePaymentStore } from "@/store/usePaymentStore";
import { Store, AlertCircle } from "lucide-react"
import { CompletedPayments } from "./components/CompletedPayments";

// Define constants for coin types
const SUI_COIN_TYPE = "0x2::sui::SUI";
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";

export default function PaymentAccountPage() {
  const params = useParams()
  const router = useRouter()
  const { getPaymentAccount, getDepsStatus } = usePaymentClient()
  const refreshCounter = usePaymentStore(state => state.refreshCounter);
  const currentAccount = useCurrentAccount()
  const suiClient = useSuiClient()
  const [paymentAcc, setPaymentAcc] = useState<Payment | null>(null);
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0))
  const [balanceInUsdc, setBalanceInUsdc] = useState<bigint>(BigInt(0))
  const [deps, setDeps] = useState<DepStatus[]>([])
  const [depsLoading, setDepsLoading] = useState(true)
  
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
  }, [currentAccount, accountId, refreshCounter]);

  useEffect(() => {
    const fetchDeps = async () => {
      if (!currentAccount?.address) return;
      
      try {
        setDepsLoading(true);
        const depsData = await getDepsStatus(
          currentAccount.address, 
          accountId
        );
        setDeps(depsData);
      } catch (error) {
        console.error('Error fetching dependencies:', error);
      } finally {
        setDepsLoading(false);
      }
    };

    fetchDeps();
  }, [currentAccount?.address, accountId]);

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
  
  const needsUpdate = deps.some(dep => dep.latestVersion > dep.currentVersion);
  
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
    <div className="w-full h-dvh overflow-y-auto">
      <div className="w-full pt-6 pb-24 flex flex-col items-center">
        <div className="w-[90%] h-full">
          <div className="container mx-auto py-0 max-w-2xl">
            <div className="mb-8 flex justify-center items-center">
              <div className="flex items-center gap-2">
                <Store className="h-6 w-6 text-white" />
                <h1 className="text-2xl font-bold text-white">{accountName}</h1>
              </div>
            </div>

            {/* Banner Update for dependencies */}
            {needsUpdate && !depsLoading && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/50 rounded-lg flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-amber-500" />
                <p className="text-amber-500 text-sm font-medium">Security updates available for your dependencies</p>
              </div>
            )}

            {/* Balance Card with actual coin data */}
            <div className="mb-10">
              <BalanceCard 
                title="Account Balance" 
                accountId={accountId}
                customBalance={balanceInSui}
                customUsdcBalance={balanceInUsdc}
              />
            </div>
            
            {/* Pending Payments Section */}
            <div className="mb-10 flex flex-col gap-8 max-w-xl items-center justify-between mx-auto">
              <PendingPayments merchantId={accountId} limit={2} />
              <CompletedPayments merchantId={accountId} limit={2} />
            </div>
          </div>
        </div>
      </div>
      <ActionButtonsMerchant />
    </div>
  )
} 