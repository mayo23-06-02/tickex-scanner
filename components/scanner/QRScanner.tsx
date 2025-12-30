"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { clsx } from "clsx";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isPaused?: boolean;
}

export default function QRScanner({ onScan, isPaused }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const scannerId = "reader-stream";

  useEffect(() => {
    // Initialize scanner
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(scannerId);
    }

    const startScanner = async () => {
      try {
        await scannerRef.current?.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            if (!isPaused) {
              onScan(decodedText);
            }
          },
          (errorMessage) => {
            // ignore errors (scanning in process)
          }
        );
        setCameraPermission(true);
      } catch (err) {
        console.error("Error starting scanner", err);
        setCameraPermission(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current
          .stop()
          .then(() => {
            scannerRef.current?.clear();
          })
          .catch((err) => console.error(err));
      }
    };
  }, [onScan, isPaused]);

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div id={scannerId} className="w-full h-full object-cover"></div>

      {/* Viewfinder Overlay */}
      <div className="absolute inset-0 border-[50px] border-black/50 pointer-events-none z-10 box-border flex items-center justify-center">
        <div className="w-[250px] h-[250px] border-2 border-white/80 rounded-lg relative">
          {/* Corners */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary -mt-1 -ml-1"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary -mt-1 -mr-1"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary -mb-1 -ml-1"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary -mb-1 -mr-1"></div>
        </div>
      </div>

      {cameraPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20 bg-black">
          <p className="text-lg font-bold mb-2">Camera Access Denied</p>
          <p className="text-sm text-gray-400">
            Please enable camera permissions in your browser settings to use the
            scanner.
          </p>
        </div>
      )}
    </div>
  );
}
