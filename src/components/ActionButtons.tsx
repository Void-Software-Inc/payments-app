import { useRouter, useParams, usePathname } from 'next/navigation';
import { ScanEye, Plus, CirclePlus, HandCoins } from 'lucide-react';
import { Button } from "@/components/ui/button";

export function ActionButtons() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const merchantId = params.id as string;
  
  // Check if we're in a merchant context
  const isMerchantContext = pathname.startsWith('/merchant/');

  const handlePaymentAsk = () => {
    if (isMerchantContext) {
      router.push(`/merchant/${merchantId}/ask-payment`);
    } else {
      router.push('/ask-payment');
    }
  };

  const handlePay = () => {
    if (isMerchantContext) {
      router.push(`/merchant/${merchantId}/pay`);
    } else {
      router.push('/pay');
    }
  };

  return (
    <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-3">
      <Button
        variant="outline"
        size="icon"
        className="w-20 h-16 rounded-lg bg-transparent backdrop-blur-md border-[#5E6164] hover:bg-black/30"
        onClick={handlePay}
      >
        <HandCoins className="size-7 text-white" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="w-20 h-16 rounded-lg bg-transparent backdrop-blur-md border-[#5E6164] hover:bg-black/30"
        onClick={handlePaymentAsk}
      >
        <CirclePlus className="size-6 text-white" />
      </Button>
    </div>
  );
} 