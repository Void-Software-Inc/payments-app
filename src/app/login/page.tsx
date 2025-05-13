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
