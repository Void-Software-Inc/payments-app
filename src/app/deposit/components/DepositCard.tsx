"use client";

import { useCurrentAccount } from '@mysten/dapp-kit';
import { useState } from 'react';
import { Copy } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function DepositCard() {
  const currentAccount = useCurrentAccount();
  const [copied, setCopied] = useState(false);
  
  const copyToClipboard = () => {
    if (currentAccount?.address) {
      navigator.clipboard.writeText(currentAccount.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  if (!currentAccount?.address) {
    return null;
  }

  return (
    <Card className="bg-[#2A2A2F] border-2 border-[#39393B]">
      <CardContent className="pb-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm text-gray-400">Your Address</p>
          <button 
            onClick={copyToClipboard}
            className="p-1 rounded-full hover:bg-gray-700 text-[#78BCDB] relative flex-shrink-0"
          >
            <Copy className="h-5 w-5" />
            {copied && (
              <span className="absolute bg-gray-700 text-white text-xs px-2 py-1 rounded top-[-30px] left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                Copied!
              </span>
            )}
          </button>
        </div>
        
        <p className="text-[#78BCDB] font-mono text-sm break-all mb-6">
          {currentAccount.address}
        </p>
        
        <p className="text-sm text-gray-400 mb-4">QR Code</p>
        <div className="flex justify-center">
          <div className="border border-[#737779] rounded-lg p-6 md:p-10 inline-block">
            <div className="w-[150px] h-[150px] sm:w-[180px] sm:h-[180px] md:w-[230px] md:h-[230px]">
              <QRCodeSVG 
                value={currentAccount.address} 
                size={230}
                bgColor="#2A2A2F"
                fgColor="#FFFFFF"
                className="w-full h-full"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 