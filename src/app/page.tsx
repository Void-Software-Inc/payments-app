"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectModal } from '@mysten/dapp-kit';
import { Wallet, Store, ChevronRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BalanceCard } from "@/components/BalanceCard";
import { ActionButtonsCustomer } from '@/components/ActionButtonsCustomer';

export default function Home() {
  const currentAccount = useCurrentAccount();

  // If not connected, show welcome screen
  if (!currentAccount?.address) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-30">
          <div className="flex items-center gap-2 mb-4">
            <Image 
              src="/drift_logo.svg" 
              alt="Drift Logo" 
              width={60} 
              height={55} 
              priority
              className=""
            />
            <h1 className="text-[70px] font-base text-white">Drift</h1>
          </div>
          
          <div className="flex flex-col gap-4 w-[194px]">   
            <ConnectModal
              trigger={
                <Button 
                  variant="outline" 
                  className="rounded-full bg-[#78BCDB] hover:bg-[#6BAAC8] text-white border-none font-medium w-full h-12"
                >
                  <Wallet className="size-4" />
                  Connect Wallet
                </Button>
              }
            />
          </div>
        </div>
        
        <div className="fixed bottom-8 flex flex-col items-center">
          <p className="text-sm text-white">Powered by account.tech</p>
          <Image 
            src="/light.svg" 
            alt="Light" 
            width={170} 
            height={4} 
            className="mt-1"
          />
        </div>
      </div>
    );
  }

  // Connected view
  return (
    <main className="container mx-auto px-4 pt-5">
      <div className="max-w-2xl mx-auto space-y-4">
        <h1 className="text-2xl text-white text-center font-bold mb-10">My Wallet</h1>
        
 
        
        {/* Balance Card */}
        <BalanceCard />

        <Link href="/merchant" className="block">
          <div className="bg-[#2A2A2F] rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#1e293b]/80 transition-colors mb-4">
            <div className="flex items-center gap-3">
              <Store className="h-5 w-5 text-[#78BCDB]" />
              <span className="text-white font-medium">Go to Merchant</span>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </Link>
      </div>
      <ActionButtonsCustomer />
    </main>
  );
}
