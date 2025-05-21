declare module 'html5-qrcode' {
  export interface CameraDevice {
    id: string;
    label: string;
  }

  export interface QrboxSize {
    width: number;
    height: number;
  }

  export interface QrConfig {
    fps?: number;
    qrbox?: number | QrboxSize;
    aspectRatio?: number;
    disableFlip?: boolean;
    formatsToSupport?: string[];
  }

  export class Html5Qrcode {
    constructor(elementId: string);
    
    static getCameras(): Promise<CameraDevice[]>;
    
    start(
      deviceId: string,
      config: QrConfig,
      successCallback: (decodedText: string) => void,
      errorCallback?: (errorMessage: string) => void
    ): Promise<void>;
    
    stop(): Promise<void>;
    
    clear(): void;
  }

  export class Html5QrcodeScanner {
    constructor(
      elementId: string,
      config: {
        fps: number;
        qrbox: number;
      },
      verbose: boolean
    );
    
    render(
      successCallback: (decodedText: string) => void,
      errorCallback: (error: string) => void
    ): void;
    
    clear(): Promise<void>;
  }
} 