"use client";

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

export default function ProfileQRCodePage() {
  const currentAccount = useCurrentAccount();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  
  // Redirect to login if wallet is not connected
  useEffect(() => {
    if (!currentAccount?.address) {
      router.push('/login');
    }
  }, [currentAccount?.address, router]);
  
  const copyToClipboard = () => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };
  
  // If not connected, show nothing while redirecting
  if (!currentAccount?.address) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 max-w-md">
      <div className="flex justify-center items-center w-full mb-6 pt-5">
        <h1 className="text-2xl font-bold text-white">My QR Code</h1>
      </div>
      
      <div className="w-full h-fit flex justify-center py-4">
        <div className="w-[90%] rounded-lg bg-[#2A2A2F] p-16 border-2 border-[#39393B]">
       

          <div className="flex justify-center">
              <QRCodeSVG 
                value={currentAccount.address} 
                size={230}
                bgColor="#2A2A2F"
                fgColor="#FFFFFF"
              />
          </div>
        </div>
      </div>
    </div>
  );
} 