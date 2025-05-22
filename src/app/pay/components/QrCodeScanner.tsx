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
  const [isMobileDevice, setIsMobileDevice] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastErrorRef = useRef<string>('');
  const errorCountRef = useRef<number>(0);

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

  // Silence QR code error warnings
  useEffect(() => {
    // Store original console.warn
    window.originalConsoleWarn = console.warn;
    
    // Override console.warn to filter out QR code errors
    console.warn = function(...args) {
      const message = args[0]?.toString() || '';
      if (message.includes('QR code parse error') || 
          message.includes('No MultiFormat Readers') || 
          message.includes('No barcode or QR code detected')) {
        // Silently ignore these common scanner warnings
        return;
      }
      // Forward other warnings to original console.warn
      if (window.originalConsoleWarn) {
        window.originalConsoleWarn.apply(console, args);
      }
    };
    
    return () => {
      // Restore original console.warn when component unmounts
      if (window.originalConsoleWarn) {
        console.warn = window.originalConsoleWarn;
      }
    };
  }, []);

  useEffect(() => {
    // Initialize scanner
    try {
      // Create scanner with default config (don't pass extra params)
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

    // Reset error tracking
    lastErrorRef.current = '';
    errorCountRef.current = 0;

    // Calculate optimal QR box size based on container width
    const containerWidth = containerRef.current?.clientWidth || 300;
    // Make QR box slightly smaller - important for our specific QR format
    const qrboxSize = Math.min(containerWidth - 60, 200);

    setError(null);
    setIsScanning(true);
    
    try {
      // Enhanced configuration with optimized settings for better detection
      const config = {
        fps: 10, // Lower fps for more stable processing on mobile
        qrbox: { width: qrboxSize, height: qrboxSize },
        aspectRatio: 1.0,
        disableFlip: isIOS,
        formatsToSupport: ['QR_CODE'],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: false // Disable experimental detector which can cause issues
        },
        videoConstraints: {
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
          facingMode: "environment",
          // Only use options that are supported by MediaTrackConstraints
          advanced: [
            { zoom: isIOS ? 1.2 : 1.0 } // Use minimal zoom to avoid distortion
          ]
        }
      };
      
      await scannerRef.current.start(
        selectedCamera,
        config,
        (decodedText: string) => {
          handleQrCodeScan(decodedText);
        },
        (errorMessage: string) => {
          // Completely ignore all errors in the callback
          // Only show errors after a significant delay
          
          // Don't update state here to avoid triggering re-renders
          // Just track the error for later
          if (errorMessage === lastErrorRef.current) {
            errorCountRef.current++;
            // Only show error after many consistent errors (100+) and significant time
            if (errorCountRef.current > 100 && !error) {
              // Use setTimeout to delay showing errors
              setTimeout(() => {
                setError("Having trouble scanning? Try in better lighting or restart the scanner.");
              }, 5000); // 5 second delay before showing error
            }
          } else {
            lastErrorRef.current = errorMessage;
            errorCountRef.current = 1;
          }
        }
      );
      
      // Try to apply focus after a short delay
      setTimeout(() => {
        try {
          const videoElement = document.querySelector('#qr-reader video') as HTMLVideoElement;
          if (videoElement) {
            if ('focus' in videoElement) {
              videoElement.focus();
            }
            
            // Apply brightness and contrast filters to video element
            // This can help with detection on darker QR codes
            if (videoElement.style) {
              videoElement.style.filter = 'contrast(1.1) brightness(1.05)';
            }
          }
        } catch (e) {
          console.warn('Could not apply video enhancements', e);
        }
      }, 1000);
      
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
      let paymentId = decodedText.trim();
      
      // Try to extract payment ID from URL if it's a URL
      if (paymentId.startsWith('http')) {
        try {
          const url = new URL(paymentId);
          const pathSegments = url.pathname.split('/').filter(Boolean);
          if (pathSegments.length) {
            paymentId = pathSegments[pathSegments.length - 1].trim();
          }
        } catch (e) {
          // If not a valid URL, use the raw text
          console.warn("Not a valid URL, using raw text");
        }
      }
      
      // Remove extraction logic - keep the full format
      
      if (paymentId) {
        // Add visual feedback
        const qrReader = document.getElementById('qr-reader');
        if (qrReader) {
          qrReader.classList.add('success-scan');
          setTimeout(() => qrReader.classList.remove('success-scan'), 500);
        }
        
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
        
        <style jsx>{`
          @keyframes success-flash {
            0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.7); }
            70% { box-shadow: 0 0 0 10px rgba(22, 163, 74, 0); }
            100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
          }
          :global(.success-scan) {
            animation: success-flash 0.5s ease-out;
            border: 2px solid #16a34a !important;
          }
        `}</style>
        
        <p className="text-xs text-gray-400 mt-4 text-center">
          Position your QR code within the scanner frame.
          {isScanning ? " Scanning..." : ""}
        </p>
      </div>
    </div>
  );
} 