"use client"
import { useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { WalletInfoCard } from '@/components/WalletInfoCard';
import { Button } from "@/components/ui/button";
import { LogOut, Copy } from "lucide-react";
import { useState } from "react";
import { truncateMiddle } from '@/utils/formatters';

export default function ProfilePage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const { mutate: disconnect } = useDisconnectWallet();
  const [copied, setCopied] = useState(false);
  
  // Redirect to login if wallet is not connected
  useEffect(() => {
    if (!currentAccount?.address) {
      router.push('/login');
    }
  }, [currentAccount?.address, router]);

  // If not connected, show nothing while redirecting
  if (!currentAccount?.address) {
    return null;
  }
  
  const copyToClipboard = () => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  return (
    <div className="container mx-auto px-4 max-w-md">
      <div className="flex justify-between items-center w-full mb-6 pt-4">
        <div className="w-8" /> {/* Spacer for balance */}
        <h1 className="text-2xl font-bold text-white">My Profile</h1>
        <div className="w-8" /> {/* Spacer for balance */}
      </div>
      
      <div className="py-4">
        <div className="mb-6 rounded-lg bg-[#2A2A2F] p-4">
          <p className="text-sm text-gray-400 mb-1">Wallet Address</p>
          <div className="flex items-center justify-between">
            <p className="text-white font-mono text-sm">
              {truncateMiddle(currentAccount.address, 12, 4)}
            </p>
            <button 
              onClick={copyToClipboard}
              className="p-1 rounded-full hover:bg-gray-700 text-gray-400 relative"
            >
              <Copy className="h-4 w-4" />
              {copied && (
                <span className="absolute bg-gray-700 text-white text-xs px-2 py-1 rounded top-[-30px] left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  Copied!
                </span>
              )}
            </button>
          </div>
        </div>
        
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            onClick={() => disconnect()}
            className="bg-transparent text-[#78BCDB] border-[#78BCDB] font-bold rounded-full flex items-center gap-2 w-[200px] h-12 max-w-xs"
          >
            <LogOut className="h-5 w-5" />
            Disconnect
          </Button>
        </div>
      </div>
    </div>
  );
} 