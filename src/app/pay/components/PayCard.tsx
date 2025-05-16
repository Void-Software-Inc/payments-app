"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, QrCode, ArrowDown } from "lucide-react";
import { 
  useCurrentAccount, 
  useSuiClient 
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";
import { signAndExecute, handleTxResult } from "@/utils/Tx";
import { formatSuiBalance } from "@/utils/formatters";
import { getCoinDecimals } from "@/utils/helpers";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QrCodeButton } from "@/components/QrCodeButton";

// USDC coin type - ensure this matches the BalanceCard.tsx definition
const USDC_COIN_TYPE = "0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29::usdc::USDC";
const SUI_COIN_TYPE = "0x2::sui::SUI";

// Custom styles to ensure white text everywhere
const selectStyles = {
  trigger: "h-8 w-[105px] pl-2 pr-2 bg-transparent border-0 focus:ring-0 text-white [&>svg]:text-white [&_svg]:text-white [&_svg]:opacity-100",
  item: "text-white focus:bg-gray-700 focus:text-white hover:text-white data-[highlighted]:text-white data-[state=checked]:text-white data-[disabled]:text-white"
};

// Interface for the component props
interface PayCardProps {
  onMakePayment: (paymentId: string, tip?: bigint) => Promise<void>;
  isProcessing: boolean;
}

export function PayCard({ onMakePayment, isProcessing }: PayCardProps) {
  const [paymentId, setPaymentId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0));
  const [balanceInUsdc, setBalanceInUsdc] = useState<bigint>(BigInt(0));
  const [usdcDecimals, setUsdcDecimals] = useState<number>(6); // Default USDC decimals is usually 6
  
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  
  // Fetch balances when the component loads
  useEffect(() => {
    const fetchBalances = async () => {
      if (currentAccount?.address) {
        try {
          // Get SUI balance for gas fees
          const suiBalanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: SUI_COIN_TYPE,
          });
          
          setBalanceInSui(BigInt(suiBalanceResponse.totalBalance));
          
          // Get USDC balance
          const usdcBalanceResponse = await suiClient.getBalance({
            owner: currentAccount.address,
            coinType: USDC_COIN_TYPE,
          });
          
          setBalanceInUsdc(BigInt(usdcBalanceResponse.totalBalance));
          
          // Get USDC decimals
          try {
            const decimals = await getCoinDecimals(USDC_COIN_TYPE, suiClient);
            setUsdcDecimals(decimals);
          } catch (error) {
            console.warn("Failed to get USDC decimals, using default:", error);
          }
        } catch (error) {
          console.error("Failed to fetch balances:", error);
        }
      }
    };
    
    fetchBalances();
  }, [currentAccount, suiClient]);
  
  const handlePaymentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentId(e.target.value);
    // Clear error when user types
    if (error) setError(null);
  };
  
  // Format USDC balance
  const formatUsdcBalance = (balance: bigint, decimals: number): string => {
    const divisor = BigInt(10) ** BigInt(decimals);
    const usdcBalance = Number(balance) / Number(divisor);
    return usdcBalance.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };
  
  const handlePay = async () => {
    if (!currentAccount?.address) {
      setError("Please connect your wallet");
      return;
    }
    
    if (!paymentId.trim()) {
      setError("Please enter a payment ID or link");
      return;
    }
    
    // Extract payment ID from link if it's a link format
    let actualPaymentId = paymentId.trim();
    
    // Check if it's a link format and extract the ID
    if (actualPaymentId.includes('/')) {
      const parts = actualPaymentId.split('/');
      actualPaymentId = parts[parts.length - 1];
    }
    
    // Check if payment ID is valid (should be 64 hex characters for a typical SUI object ID)
    if (!/^(0x)?[a-fA-F0-9]{40,64}$/.test(actualPaymentId)) {
      setError("Invalid payment ID format");
      return;
    }
    
    // Check if user has enough SUI for gas
    const gasBuffer = BigInt(20_000_000); // 0.02 SUI for gas
    if (balanceInSui < gasBuffer) {
      setError("Insufficient SUI balance for gas fees. Please maintain at least 0.02 SUI.");
      return;
    }
    
    try {
      // Call the onMakePayment function with the payment ID
      // Currently not adding a tip (passing 0n as the tip amount)
      await onMakePayment(actualPaymentId, BigInt(0));
      
      // Reset payment ID after successful payment
      setPaymentId("");
    } catch (error) {
      console.error("Error in handlePay:", error);
      // Error handling is done in the parent component
    }
  };
  
  // Format balances for display
  const formattedSuiBalance = formatSuiBalance(balanceInSui);
  const formattedUsdcBalance = formatUsdcBalance(balanceInUsdc, usdcDecimals);
  
  return (
    <div>
        <Card className="w-full bg-[#2A2A2F] border-[#33363A] rounded-lg shadow-lg">
        <CardContent className="space-y-6 mt-1 mb-3">
            {/* Payment ID Input */}
            <div className="space-y-2 mt-2">
            <Label htmlFor="paymentId" className="text-md text-[#c8c8c8] font-medium">
                Paste link or id
            </Label>
            <div className="flex items-center gap-2">
                <Input
                id="paymentId"
                value={paymentId}
                onChange={handlePaymentIdChange}
                placeholder="suipay/..."
                className="h-14 bg-transparent border-[#5E6164] rounded-lg text-white text-lg"
                autoComplete="off"
                />
                
            </div>
            </div>
            
            {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
            )}
            
            {/* Pay Button */}
            <Button
            onClick={handlePay}
            className="w-full h-13 mt-4 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-lg"
            disabled={isProcessing}
            >
            {isProcessing ? "Processing..." : "Pay Now"}
            </Button>
        </CardContent>
        </Card>

    <QrCodeButton />
   
  </div>
  );
} 