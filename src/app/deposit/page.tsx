"use client";

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DepositCard } from './components/DepositCard';
import { FiatButton } from '@/components/FiatButton';

export default function DepositPage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  
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

  return (
    <div className="container mx-auto px-4 max-w-md h-dvh w-dvw">
      <div className="flex justify-center items-center w-full mb-6 pt-5">
        <h1 className="text-2xl font-bold text-white">Deposit</h1>
      </div>
      
      <div className="">
        <DepositCard />
        <FiatButton />
      </div>
    </div>
  );
} 