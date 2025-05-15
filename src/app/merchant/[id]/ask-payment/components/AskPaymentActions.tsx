import { Button } from "@/components/ui/button"
import { HandCoins, CirclePlus, Loader2 } from "lucide-react"

interface AskPaymentActionsProps {
  isProcessing?: boolean
}

export function AskPaymentActions({ isProcessing = false }: AskPaymentActionsProps) {
  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-3">
      <Button
        variant="outline"
        size="icon"
        disabled={isProcessing}
        className="w-20 h-16 rounded-lg bg-transparent backdrop-blur-md border-[#5B5F62] hover:bg-black/30"
      >
        {isProcessing ? (
          <Loader2 className="size-7 text-white animate-spin" />
        ) : (
          <HandCoins className="size-7 text-white" />
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={isProcessing}
        className="w-20 h-16 rounded-lg bg-transparent backdrop-blur-md border-[#5B5F62] hover:bg-black/30"
      >
        <CirclePlus className="size-6 text-white" />
      </Button>
    </div>
  )
}