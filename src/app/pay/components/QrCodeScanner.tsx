import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Camera } from 'lucide-react';

// Extend the Window interface to override console methods
declare global {
  interface Window {
    originalConsoleWarn?: typeof console.warn;
  }
}

interface QrCodeScannerProps {
  onScanSuccess: (paymentId: string) => void;
  onClose: () => void;
}

export function QrCodeScanner({ onScanSuccess, onClose }: QrCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect device type
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const iosDevice = /iPhone|iPad|iPod/i.test(userAgent);
    setIsIOS(iosDevice);
  }, []);

  // Initialize scanner and get cameras
  useEffect(() => {
    try {
      // Simple initialization
      scannerRef.current = new Html5Qrcode("qr-reader");
      
      Html5Qrcode.getCameras().then((devices: CameraDevice[]) => {
        if (devices && devices.length) {
          setCameras(devices);
          
          // Try to find back camera
          const backCamera = devices.find((camera: CameraDevice) => 
            camera.label.toLowerCase().includes('back')
          );
          
          // Default to first camera if no back camera found
          setSelectedCamera(backCamera?.id || devices[0].id);
        } else {
          setError("No cameras found. Please allow camera access.");
        }
      }).catch((err: Error) => {
        setError("Unable to access camera. Please check permissions.");
      });
    } catch (err) {
      setError("Failed to initialize camera scanner.");
    }

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Start scanning when camera is selected
  useEffect(() => {
    if (selectedCamera) {
      startScanning();
    }
  }, [selectedCamera]);

  const startScanning = async () => {
    if (!scannerRef.current || !selectedCamera) return;
    
    // Stop any existing scan
    if (isScanning) {
      await scannerRef.current.stop().catch(() => {});
    }

    setError(null);
    setIsScanning(true);
    
    try {
      // Extremely simplified configuration
      await scannerRef.current.start(
        selectedCamera,
        {
          fps: 5,  // Low FPS for reliable processing
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1,
        },
        (decodedText) => {
          // Success handler
          if (scannerRef.current) {
            scannerRef.current.stop().catch(() => {});
          }
          setIsScanning(false);
          onScanSuccess(decodedText.trim());
          onClose();
        },
        // Skip error handling - don't show errors at all
        () => {}
      );
    } catch (err: any) {
      setError("Camera error. Please try again.");
      setIsScanning(false);
    }
  };

  const switchCamera = async () => {
    if (!cameras || cameras.length <= 1) return;
    
    const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].id);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div ref={containerRef} className="bg-[#2A2A2F] p-6 rounded-lg w-[90%] max-w-md relative">
        <Button
          onClick={onClose}
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
        >
          <X className="size-4 text-white" />
        </Button>
        
        <h3 className="text-lg font-medium text-white mb-4">
          Scan QR Code
        </h3>
        
        {error && (
          <div className="bg-red-900/30 text-red-300 p-3 rounded mb-4 text-sm">
            {error}
            <Button 
              onClick={startScanning} 
              variant="outline" 
              size="sm" 
              className="ml-2 h-7"
            >
              <RefreshCw className="size-3 mr-1" /> Retry
            </Button>
          </div>
        )}
        
        <div 
          id="qr-reader" 
          className="w-full overflow-hidden rounded-lg aspect-square"
          style={{ width: '100%', aspectRatio: '1/1' }}
        ></div>
        
        {cameras.length > 1 && (
          <Button
            onClick={switchCamera}
            variant="outline"
            className="w-full mt-4"
            disabled={!isScanning}
          >
            <Camera className="size-4 mr-2" /> Switch Camera
          </Button>
        )}
        
        <style jsx>{`
          #qr-reader {
            border: none !important;
          }
          #qr-reader video {
            object-fit: cover !important;
            width: 100% !important;
            height: 100% !important;
            border-radius: 8px !important;
          }
          #qr-reader__dashboard_section {
            display: none !important;
          }
          #qr-reader__status_span {
            display: none !important;
          }
        `}</style>
        
        <p className="text-xs text-gray-400 mt-4 text-center">
          Position your QR code within the scanner frame.
        </p>
      </div>
    </div>
  );
} 