import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import Image from "next/image"
import { Loader2 } from "lucide-react"

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
    
    onGeneratePayment(amount, message)
  }

  return (
    <Card className="w-full h-fit bg-[#2A2A2F] p-0 border-none">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <CardContent className="p-6">
          <div className="mb-7">
            <label htmlFor="amount" className="text-zinc-400 text-md mb-1 block">Amount</label>
            <div className="flex items-end">
              <input
                id="amount"
                type="text"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0.00"
                className="text-5xl font-semibold text-white bg-transparent border-none outline-none w-full p-0"
                aria-label="Payment amount in USDC"
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
            <label htmlFor="message" className="text-zinc-400 text-md mb-3 block">Message</label>
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