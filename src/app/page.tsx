"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BalanceCard } from "@/components/BalanceCard";
import { truncateMiddle } from "@/utils/formatters";

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
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto space-y-8 mt-10">
        {/* Balance Card */}
        <BalanceCard />
        
        {/* Wallet Info Card */}
        <div className="p-5 rounded-lg border border-gray-700 bg-[#2A2A2F] shadow-lg">
          <h2 className="text-lg font-semibold mb-2 text-gray-300">Connected Wallet</h2>
          <div className="flex justify-between items-center">
            <p className="font-mono text-sm text-gray-400">
              {truncateMiddle(currentAccount.address, 8, 6)}
            </p>
            <p className="font-mono text-xs text-gray-500 cursor-pointer hover:text-gray-300" 
               onClick={() => navigator.clipboard.writeText(currentAccount.address)}>
              Copy
            </p>
          </div>
        </div>
        
        {/* Additional components can be added here later */}
      </div>
    </main>
  );
}
