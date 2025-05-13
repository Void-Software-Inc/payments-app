import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Image from "next/image"

interface PaymentFormProps {
  onGeneratePayment: (amount: string, message: string) => void
}

export function PaymentForm({ onGeneratePayment }: PaymentFormProps) {
  const [amount, setAmount] = useState("0.00")
  const [message, setMessage] = useState("")

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers and one comma/dot
    const value = e.target.value.replace(/[^0-9.,]/g, "")
    // Format with comma as decimal separator
    setAmount(value)
  }

  const handleSubmit = () => {
    onGeneratePayment(amount, message)
  }

  return (
    <div className="w-full h-full bg-[#2A2A2F] rounded-lg p-6">
      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="mb-7">
          <label htmlFor="amount" className="text-zinc-400 text-md mb-1 block">Amount</label>
          <div className="flex items-end">
            <input
              id="amount"
              type="text"
              value={amount}
              onChange={handleAmountChange}
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
        
        <Button 
          type="submit"
          className="w-full h-14 mt-4 rounded-full bg-[#78BCDB] hover:bg-[#68ACCC] text-white font-medium text-lg"
        >
          Generate Payment
        </Button>
      </form>
    </div>
  )
} 