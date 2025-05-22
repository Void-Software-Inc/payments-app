import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, Camera, RefreshCw } from 'lucide-react';

interface QrCodeScannerProps {
  onClose: () => void;
  onScanSuccess: (scannedText: string) => void;
}

export function QrCodeScanner({ onClose, onScanSuccess }: QrCodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS device
    const userAgent = navigator.userAgent || navigator.vendor;
    const ios = /iPhone|iPad|iPod/i.test(userAgent);
    setIsIOS(ios);

    // Add iOS-specific styles
    if (ios) {
      const style = document.createElement('style');
      style.innerHTML = `
        #qr-reader {
          position: relative !important;
          padding: 0 !important;
        }
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 8px !important;
        }
        #qr-reader > div {
          width: 100% !important;
          height: 100% !important;
        }
        #qr-reader__dashboard_section {
          display: none !important;
        }
        #qr-reader__scan_region {
          width: 100% !important;
          height: 100% !important;
          min-height: 300px !important;
        }
      `;
      document.head.appendChild(style);
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  const startScanner = async () => {
    if (!scannerRef.current) return;
    
    try {
      setError(null);
      
      // Configure scanner with optimized settings for mobile
      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: ['QR_CODE'],
        videoConstraints: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "environment",
          // Enhanced settings for better mobile performance
          advanced: [
            { zoom: isIOS ? 1.5 : 1.2 }, // Slight zoom for better focus
            { focusMode: "continuous" }
          ]
        }
      };

      await scannerRef.current.start(
        { facingMode: "environment" } as any,
        config,
        (decodedText) => {
          handleQrCodeScan(decodedText);
        },
        () => {
          // Silent error handling
        }
      );
    } catch (err) {
      console.error("Scanner error:", err);
      setError("Camera access failed. Please check permissions.");
    }
  };

  const handleQrCodeScan = async (decodedText: string) => {
    try {
      let paymentId = decodedText.trim();
      
      // Handle URL format
      if (paymentId.includes('://')) {
        const parts = paymentId.split('/');
        paymentId = parts[parts.length - 1];
      }
      
      // Clean up query parameters if present
      if (paymentId.includes('?')) {
        paymentId = paymentId.split('?')[0];
      }

      // Add success animation
      const qrReader = document.getElementById('qr-reader');
      if (qrReader) {
        qrReader.classList.add('success-scan');
      }

      // Stop scanner and close
      if (scannerRef.current) {
        await scannerRef.current.stop();
        onScanSuccess(paymentId);
        onClose();
      }
    } catch (error) {
      console.error("QR scan error:", error);
      setError("Invalid QR code. Please try again.");
    }
  };

  useEffect(() => {
    // Initialize scanner
    scannerRef.current = new Html5Qrcode("qr-reader");
    startScanner();

    // Cleanup
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-[#2A2A2F] rounded-lg p-6 w-full max-w-md relative">
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 text-gray-400 hover:text-white"
          onClick={onClose}
        >
          <X className="h-5 w-5" />
        </Button>

        <h3 className="text-lg font-medium text-white mb-4 text-center">
          Scan QR Code
        </h3>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm flex items-center justify-between">
              {error}
              <Button
                variant="ghost"
                size="sm"
                onClick={startScanner}
                className="ml-2 text-red-400 hover:text-red-300"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </p>
          </div>
        )}

        <div 
          id="qr-reader" 
          className="w-full aspect-square bg-black rounded-lg overflow-hidden relative"
        />
        
        <p className="text-sm text-gray-400 text-center mt-4">
          Position the QR code within the frame
        </p>

        <style jsx>{`
          @keyframes success-flash {
            0% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(34, 197, 94, 0); }
            100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); }
          }
          :global(.success-scan) {
            animation: success-flash 0.5s ease-out;
            border: 2px solid #22c55e !important;
          }
        `}</style>
      </div>
    </div>
  );
} 