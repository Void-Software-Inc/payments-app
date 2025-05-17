import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardDescription } from "@/components/ui/card"
import Image from "next/image"
import { Loader2, HelpCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PaymentFormProps {
  onGeneratePayment: (amount: string, message: string) => void
  isProcessing?: boolean
}

export function PaymentForm({ onGeneratePayment, isProcessing = false }: PaymentFormProps) {
  const [amount, setAmount] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState<string | null>(null)

  // Focus the amount input when the component mounts
  useEffect(() => {
    const amountInput = document.getElementById('amount');
    if (amountInput) {
      amountInput.focus();
    }
  }, []);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Allow empty input for clearing
    if (value === '') {
      setAmount('');
      return;
    }
    if (!/^[0-9]*\.?[0-9]*$/.test(value)) {
      return;
    }
    
    setAmount(value);
    // Clear error when user starts typing a valid amount
    if (value && parseFloat(value) > 0) {
      setError(null);
    }
  }

  const handleSubmit = () => {
    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      setError("Please enter an amount greater than 0")
      return
    }
    
    // Ensure amount is properly formatted as a valid number string
    const numericAmount = parseFloat(amount).toString();
    onGeneratePayment(numericAmount, message)
  }

  return (
    <Card className="w-full h-fit bg-[#2A2A2F] p-0 border-none">
      <CardHeader className="px-6 pt-6 pb-2">
        <CardDescription className="text-zinc-400">
          Generate a payment request that your customers can pay later. The payment request will create a unique payment ID that can be shared.
        </CardDescription>
      </CardHeader>
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <CardContent className="p-6 pt-2">
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-1">
              <label htmlFor="amount" className="text-zinc-400 text-md block">Amount</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-zinc-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm max-w-60">Enter the amount in USDC you want to request from your customer.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="flex items-end">
              <Input
                id="amount"
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="text-5xl font-semibold text-white bg-transparent border-none outline-none w-full p-0 h-auto shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                aria-label="Payment amount in USDC"
                autoComplete="off"
              />
              <div className="flex items-center gap-1 ml-2 mb-1">
                <div className="w-5 h-5 relative">
                  <Image
                    src="/usdc-logo.webp"
                    alt="USDC Currency Icon"
                    fill
                    sizes="20px"
                    className="object-contain rounded-full"
                    priority
                  />
                </div>
                <span className="text-white font-medium">USDC</span>
              </div>
            </div>
            {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
          </div>
          
          <div className="mb-7">
            <div className="flex items-center gap-2 mb-3">
              <label htmlFor="message" className="text-zinc-400 text-md block">Message</label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-zinc-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-sm max-w-60">Add a description of what this payment is for. This will be visible to your customer.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Your message ..."
              className="bg-transparent border-zinc-700 text-white text-md"
              aria-label="Payment message"
              autoComplete="off"
            />
          </div>
        </CardContent>
        
        <CardFooter className="p-6 pt-0 mb-2">
          <Button 
            type="submit"
            disabled={isProcessing}
            className="w-full h-14 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-lg"
          >
            {isProcessing ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Generate Payment"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
} 