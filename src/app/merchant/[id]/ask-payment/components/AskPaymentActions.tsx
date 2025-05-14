import { Button } from "@/components/ui/button"
import { CirclePlus, HandCoins } from "lucide-react"

export function AskPaymentActions() {
  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className="w-20 h-16 rounded-lg bg-transparent backdrop-blur-md border-[#5B5F62] hover:bg-black/30"
      >
        <HandCoins className="size-7 text-white" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="w-20 h-16 rounded-lg bg-transparent backdrop-blur-md border-[#5B5F62] hover:bg-black/30"
      >
        <CirclePlus className="size-6 text-white" />
      </Button>
    </div>
  )
} 