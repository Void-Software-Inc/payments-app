import { useEffect, useState, useRef } from 'react';
import { Html5Qrcode, CameraDevice } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { X, RefreshCw, Camera } from 'lucide-react';

interface QrCodeScannerProps {
  onScanSuccess: (paymentId: string) => void;
  onClose: () => void;
}

export function QrCodeScanner({ onScanSuccess, onClose }: QrCodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect if user is on mobile device
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const iosDevice = /iPhone|iPad|iPod/i.test(userAgent);
    setIsMobileDevice(isMobile);
    setIsIOS(iosDevice);
    
    // Add CSS to fix iOS camera display issues
    if (iosDevice) {
      const style = document.createElement('style');
      style.innerHTML = `
        #qr-reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
        #qr-reader {
          width: 100% !important;
          min-height: 300px !important;
          position: relative !important;
          aspect-ratio: 1 / 1 !important;
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
        #qr-reader__scan_region > video {
          object-fit: cover !important;
          border-radius: 8px !important;
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        document.head.removeChild(style);
      };
    }
  }, []);

  useEffect(() => {
    // Initialize scanner
    try {
      scannerRef.current = new Html5Qrcode("qr-reader");
      
      // Get list of cameras
      Html5Qrcode.getCameras().then((devices: CameraDevice[]) => {
        if (devices && devices.length) {
          setCameras(devices);
          
          // On iOS, the front camera often has "front" in the label
          if (isIOS) {
            // For iOS, default to back camera (usually has "back" in the name)
            const backCamera = devices.find((camera: CameraDevice) => 
              camera.label.toLowerCase().includes('back')
            );
            // If no "back" camera found, use the last device which is typically the back camera on iOS
            setSelectedCamera(backCamera?.id || devices[devices.length - 1].id);
          } else {
            // For Android or other devices
            const backCamera = devices.find((camera: CameraDevice) => 
              camera.label.toLowerCase().includes('back')
            );
            setSelectedCamera(backCamera?.id || devices[0].id);
          }
        } else {
          setError("No cameras found. Please allow camera access.");
        }
      }).catch((err: Error) => {
        console.error("Error getting cameras", err);
        setError("Unable to access camera. Please allow camera access.");
      });
    } catch (err) {
      console.error("Error initializing scanner:", err);
      setError("Failed to initialize camera scanner.");
    }

    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [isIOS]);

  useEffect(() => {
    if (selectedCamera) {
      startScanning();
    }
  }, [selectedCamera]);

  const startScanning = async () => {
    if (!scannerRef.current || !selectedCamera) return;
    
    if (isScanning) {
      await scannerRef.current.stop().catch(console.error);
    }

    // Calculate optimal QR box size based on container width
    const containerWidth = containerRef.current?.clientWidth || 300;
    // Make sure qrboxSize is square (same width and height)
    const qrboxSize = Math.min(containerWidth - 20, 250);

    setError(null);
    setIsScanning(true);
    
    try {
      // iOS specific configuration
      const config = {
        fps: isIOS ? 5 : 10, // Lower fps on iOS to reduce processing load
        qrbox: { width: qrboxSize, height: qrboxSize },
        // Force 1:1 aspect ratio for square camera view
        aspectRatio: 1.0,
        disableFlip: isIOS, // Disable flip on iOS as it can cause issues
        formatsToSupport: ['QR_CODE']
      };
      
      await scannerRef.current.start(
        selectedCamera,
        config,
        (decodedText: string) => {
          handleQrCodeScan(decodedText);
        },
        (errorMessage: string) => {
          // Silent error handling for scanning errors
          console.warn(errorMessage);
        }
      );
    } catch (err: any) {
      console.error("Error starting scanner:", err);
      setError(`Error starting scanner: ${err.message || err}`);
      setIsScanning(false);
    }
  };

  const switchCamera = async () => {
    if (!cameras || cameras.length <= 1) return;
    
    const currentIndex = cameras.findIndex(c => c.id === selectedCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setSelectedCamera(cameras[nextIndex].id);
  };

  const handleQrCodeScan = (decodedText: string) => {
    try {
      let paymentId = decodedText;
      
      // Try to extract payment ID from URL if it's a URL
      if (decodedText.startsWith('http')) {
        try {
          const url = new URL(decodedText);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          if (pathSegments.length) {
            paymentId = pathSegments[pathSegments.length - 1];
          }
        } catch (e) {
          // If not a valid URL, use the raw text
          console.warn("Not a valid URL, using raw text");
        }
      }
      
      if (paymentId) {
        // Stop scanner
        if (scannerRef.current) {
          scannerRef.current.stop().catch(console.error);
        }
        setIsScanning(false);
        onScanSuccess(paymentId);
        onClose();
      }
    } catch (error) {
      console.error("Error handling QR code scan:", error);
      setError("Invalid QR code format");
    }
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
        
        <p className="text-xs text-gray-400 mt-4 text-center">
          Position your QR code within the scanner frame.
          {isScanning ? " Scanning..." : ""}
        </p>
      </div>
    </div>
  );
} 