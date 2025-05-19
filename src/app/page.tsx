"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BalanceCard } from "@/components/BalanceCard";
import { History } from "@/components/History";
import { ActionButtonsCustomer } from '@/components/ActionButtonsCustomer';

export default function Home() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  
  // Redirect to login if wallet is not connected
  useEffect(() => {
    if (!currentAccount?.address) {
      router.push('/login');
    }
  }, [currentAccount, router]);

  // If not connected, show nothing while redirecting
  if (!currentAccount?.address) {
    return null;
  }

  return (
    <main className="container mx-auto px-4 pt-10">
      <div className="max-w-2xl mx-auto space-y-8 mt-10">

        {/* Balance Card */}
        <BalanceCard />
        
        {/* History */}
        <History limit={4} />
      </div>
      <ActionButtonsCustomer />
    </main>
  );
}
