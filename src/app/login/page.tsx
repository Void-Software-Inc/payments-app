"use client"

import Image from "next/image";
import { ConnectModal, useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, Store } from "lucide-react";

export default function LoginPage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  
  // Redirect to home if wallet is connected
  useEffect(() => {
    if (currentAccount?.address) {
      router.push('/');
    }
  }, [currentAccount, router]);

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
                className="rounded-full border-[#78BCDB] text-[#78BCDB] font-medium bg-transparent hover:bg-[#78BCDB]/10 w-full h-12"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Connect Wallet
              </Button>
            }
          />

          <Button 
            variant="outline" 
            className="rounded-full bg-[#78BCDB] hover:bg-[#6BAAC8] text-white font-medium border-none w-full h-12"
          >
            <Store className="h-4 w-4 mr-2" />
            Merchant Login
          </Button>
        </div>
      </div>
      
      <div className="fixed bottom-8">
        <p className="text-sm text-gray-400">Powered by account.tech</p>
      </div>
    </div>
  );
}
