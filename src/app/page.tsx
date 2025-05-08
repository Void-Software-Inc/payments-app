"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from "next/navigation";
import { useEffect } from "react";

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
    <div className="min-h-screen p-8">
      <main className="container mx-auto max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Wallet Connection Status</h1>
          
          <div className="p-4 rounded-lg border bg-card">
            <h2 className="text-lg font-semibold mb-2">Connected Wallet</h2>
            <p className="font-mono text-sm break-all">
              {currentAccount.address}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
