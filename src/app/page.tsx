"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';
import { ConnectModal } from '@mysten/dapp-kit';
import { Wallet } from "lucide-react";
import Image from "next/image";
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
    <main className="container mx-auto px-4 pt-10">
      <div className="max-w-2xl mx-auto space-y-8 mt-10">
        {/* Balance Card */}
        <BalanceCard />
      </div>
      <ActionButtonsCustomer />
    </main>
  );
}
