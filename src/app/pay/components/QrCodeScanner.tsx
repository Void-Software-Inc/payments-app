import { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface QrCodeScannerProps {
  onScanSuccess: (paymentId: string) => void;
  onClose: () => void;
}

export function QrCodeScanner({ onScanSuccess, onClose }: QrCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    // Create instance of scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: 250 },
      false
    );

    // Start scanning
    scanner.render((decodedText) => {
      // Extract payment ID from scanned URL
      const url = new URL(decodedText);
      const pathSegments = url.pathname.split('/');
      const paymentId = pathSegments[pathSegments.length - 1];
      
      // Pass the payment ID to parent
      onScanSuccess(paymentId);
      
      // Stop scanning and cleanup
      scanner.clear();
      onClose();
    }, (error) => {
      // Handle errors silently
      console.warn(`QR Code scanning error: ${error}`);
    });

    // Cleanup on unmount
    return () => {
      scanner.clear();
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="bg-[#2A2A2F] p-6 rounded-lg w-[90%] max-w-md relative">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
        >
          <X className="size-4 text-white" />
        </Button>
        
        <h3 className="text-lg font-medium text-white mb-4">Scan QR Code</h3>
        <div id="qr-reader" className="w-full" />
      </div>
    </div>
  );
} 