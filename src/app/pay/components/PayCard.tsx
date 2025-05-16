"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, QrCode, ArrowDown, Plus, Minus, Loader2 } from "lucide-react";
import { 
  useCurrentAccount, 
  useSuiClient 
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { toast } from "sonner";
import { signAndExecute, handleTxResult } from "@/utils/Tx";
import { formatSuiBalance, truncateMiddle } from "@/utils/formatters";
import { getCoinDecimals } from "@/utils/helpers";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { QrCodeButton } from "@/components/QrCodeButton";
import { usePaymentClient } from "@/hooks/usePaymentClient";

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
  const [tipAmount, setTipAmount] = useState<string>("0");
  const [error, setError] = useState<string | null>(null);
  const [balanceInSui, setBalanceInSui] = useState<bigint>(BigInt(0));
  const [balanceInUsdc, setBalanceInUsdc] = useState<bigint>(BigInt(0));
  const [usdcDecimals, setUsdcDecimals] = useState<number>(6); // Default USDC decimals is usually 6
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  const [loadingPaymentDetails, setLoadingPaymentDetails] = useState(false);
  
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const { getIntent } = usePaymentClient();
  
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
  
  // Try to fetch payment details when a valid ID is entered
  useEffect(() => {
    // Only proceed if we have a wallet connected
    if (!currentAccount?.address) return;
    
    // Extract actual payment ID from any format
    let actualPaymentId = paymentId.trim();
    
    // If no ID entered, clear payment details
    if (!actualPaymentId) {
      setPaymentDetails(null);
      return;
    }
    
    // If it's a link format, extract just the ID part
    if (actualPaymentId.includes('/')) {
      const parts = actualPaymentId.split('/');
      actualPaymentId = parts[parts.length - 1];
    }
    
    // Check if payment ID is valid (should be 64 hex characters with optional 0x prefix)
    if (/^(0x)?[a-fA-F0-9]{40,64}$/.test(actualPaymentId)) {
      const fetchPaymentDetails = async () => {
        setLoadingPaymentDetails(true);
        setPaymentDetails(null);
        
        try {
          // Get the intent directly
          const intent = await getIntent(currentAccount.address, actualPaymentId);
          
          if (intent) {
            // Use type assertion to handle the custom intent properties
            const customIntent = intent as any;
            const args = customIntent.args || {};
            
            const formattedDetails = {
              amount: args.amount || "0",
              description: args.description || "",
              sender: customIntent.creator || "Unknown",
              coinType: args.coinType || USDC_COIN_TYPE,
              timestamp: customIntent.timestamp ? new Date(customIntent.timestamp).toLocaleString() : "Unknown"
            };
            
            setPaymentDetails(formattedDetails);
            setError(null);
          } else {
            setError("Payment not found. Please check the ID and try again.");
          }
        } catch (error) {
          console.warn("Failed to fetch payment details:", error);
          setError("Failed to load payment details.");
        } finally {
          setLoadingPaymentDetails(false);
        }
      };
      
      fetchPaymentDetails();
    } else if (actualPaymentId) {
      // If we have a non-empty ID but it's not in the right format
      setError("Invalid payment ID format. Please enter a valid payment ID.");
      setPaymentDetails(null);
    }
  }, [paymentId, currentAccount?.address, getIntent]);
  
  const handlePaymentIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPaymentId(e.target.value);
    // Clear error when user types
    if (error) setError(null);
  };
  
  const handleTipChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Allow only valid numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setTipAmount(value);
    }
  };
  
  const adjustTip = (increment: boolean) => {
    let currentTip = parseFloat(tipAmount) || 0;
    if (increment) {
      currentTip += 1;
    } else {
      currentTip = Math.max(0, currentTip - 1);
    }
    setTipAmount(currentTip.toString());
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
      setError("Please enter a payment ID");
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
      // Convert tip amount to bigint (USDC has 6 decimals)
      const tipValue = parseFloat(tipAmount) || 0;
      const tipInSmallestUnit = BigInt(Math.floor(tipValue * 1_000_000));
      
      // Call the onMakePayment function with the payment ID and tip amount
      await onMakePayment(actualPaymentId, tipInSmallestUnit);
      
      // Reset payment ID and tip after successful payment
      setPaymentId("");
      setTipAmount("0");
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
            
            {/* Payment Details (if available) */}
            {loadingPaymentDetails && (
              <div className="text-center text-zinc-400 py-2">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Loading payment details...
              </div>
            )}
            
            {paymentDetails && (
              <div className="bg-[#363639] rounded-lg p-4 mt-2">
                <div className="flex justify-between mb-2">
                  <span className="text-zinc-400">Amount:</span>
                  <span className="text-white font-medium">
                    {formatUsdcBalance(BigInt(paymentDetails.amount), usdcDecimals)} USDC
                  </span>
                </div>
                {paymentDetails.description && (
                  <div className="flex justify-between mb-2">
                    <span className="text-zinc-400">Description:</span>
                    <span className="text-white">{paymentDetails.description}</span>
                  </div>
                )}
                <div className="flex justify-between mb-2">
                  <span className="text-zinc-400">Requested by:</span>
                  <span className="text-white">
                    {paymentDetails.sender ? truncateMiddle(paymentDetails.sender) : "Unknown"}
                  </span>
                </div>
                {paymentDetails.timestamp && (
                  <div className="flex justify-between text-xs text-zinc-500 mt-3">
                    <span>Created:</span>
                    <span>{paymentDetails.timestamp}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Tip Amount Input */}
            <div className="space-y-2 mt-2">
              <Label htmlFor="tipAmount" className="text-md text-[#c8c8c8] font-medium">
                Add tip (optional)
              </Label>
              <div className="flex items-center gap-2">
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline" 
                  onClick={() => adjustTip(false)}
                  className="h-8 w-8 bg-transparent border-[#5E6164]"
                >
                  <Minus className="h-4 w-4 text-white" />
                </Button>
                <Input
                  id="tipAmount"
                  value={tipAmount}
                  onChange={handleTipChange}
                  placeholder="0.00"
                  className="h-10 bg-transparent border-[#5E6164] rounded-lg text-white text-md text-center"
                  autoComplete="off"
                />
                <Button 
                  type="button" 
                  size="icon" 
                  variant="outline" 
                  onClick={() => adjustTip(true)}
                  className="h-8 w-8 bg-transparent border-[#5E6164]"
                >
                  <Plus className="h-4 w-4 text-white" />
                </Button>
                <div className="flex items-center ml-1">
                  <div className="w-4 h-4 relative">
                    <Image
                      src="/usdc-logo.webp"
                      alt="USDC"
                      fill
                      sizes="16px"
                      className="object-contain rounded-full"
                    />
                  </div>
                  <span className="text-white text-sm ml-1">USDC</span>
                </div>
              </div>
            </div>
            
            {error && (
            <div className="text-red-500 text-sm mt-2">{error}</div>
            )}
            
            {/* Pay Button */}
            <Button
            onClick={handlePay}
            className="w-full h-13 mt-4 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-lg"
            disabled={isProcessing || !paymentId.trim()}
            >
            {isProcessing ? "Processing..." : "Pay Now"}
            </Button>
        </CardContent>
        </Card>

    <QrCodeButton />
   
  </div>
  );
} 