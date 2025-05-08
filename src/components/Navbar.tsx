"use client"
import { ConnectModal, useCurrentAccount, useDisconnectWallet } from '@mysten/dapp-kit';
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from 'lucide-react';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const currentAccount = useCurrentAccount();
  const { mutate: disconnect } = useDisconnectWallet();
  const pathname = usePathname();
  
  // Don't render navbar on the login page
  if (pathname === '/login') {
    return null;
  }

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4 container mx-auto justify-between">
        <div className="flex items-center gap-4">
          {/* Add your logo or other navbar items here */}
        </div>
        
        <div>
          {currentAccount?.address ? (
            <Button
              variant="outline"
              onClick={() => disconnect()}
              className="rounded-full flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          ) : (
            <ConnectModal
              trigger={
                <Button variant="outline" className="rounded-full flex items-center gap-2">
                  <Wallet className="h-4 w-4" />
                  Connect
                </Button>
              }
            />
          )}
        </div>
      </div>
    </nav>
  );
}
