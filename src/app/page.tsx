"use client"
import { useCurrentAccount } from '@mysten/dapp-kit';

export default function Home() {
  const currentAccount = useCurrentAccount();

  return (
    <div className="min-h-screen p-8">
      <main className="container mx-auto max-w-2xl">
        <div className="space-y-4">
          <h1 className="text-2xl font-bold">Wallet Connection Status</h1>
          
          {currentAccount?.address ? (
            <div className="p-4 rounded-lg border bg-card">
              <h2 className="text-lg font-semibold mb-2">Connected Wallet</h2>
              <p className="font-mono text-sm break-all">
                {currentAccount.address}
              </p>
            </div>
          ) : (
            <div className="p-4 rounded-lg border bg-card">
              <p className="text-muted-foreground">No wallet connected</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
