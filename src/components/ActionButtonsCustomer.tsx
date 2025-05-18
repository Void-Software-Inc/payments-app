import { useRouter, useParams, usePathname } from 'next/navigation';
import { HandCoins, ArrowUpDown } from 'lucide-react';
import { Button } from "@/components/ui/button";

export function ActionButtonsCustomer() {
  const router = useRouter();
  const params = useParams();
  const pathname = usePathname();
  const merchantId = params.id as string;
  
  // Check if we're in a merchant context
  const isMerchantContext = pathname.startsWith('/merchant/');
  
  // Check current page to disable buttons appropriately
  const isWithdrawPage = pathname.includes('/withdraw');
  const isPayPage = pathname.includes('/pay');

  const handlePaymentAsk = () => {
    if (isMerchantContext) {
      router.push(`/merchant/${merchantId}/withdraw`);
    } else {
      router.push('/withdraw');
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
        disabled={isPayPage}
      >
        <HandCoins className="size-7 text-white" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="w-20 h-16 rounded-lg bg-transparent backdrop-blur-md border-[#5E6164] hover:bg-black/30"
        onClick={handlePaymentAsk}
        disabled={isWithdrawPage}
      >
        <ArrowUpDown className="size-6 text-white" />
      </Button>
    </div>
  );
} 