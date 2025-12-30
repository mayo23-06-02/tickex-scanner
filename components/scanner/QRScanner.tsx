"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  isPaused?: boolean;
}

export default function QRScanner({ onScan, isPaused }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const onScanRef = useRef(onScan);
  const isPausedRef = useRef(isPaused);
  const scannerId = "reader-stream";

  // Keep refs updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Initialize scanner only once
  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      try {
        // Check if scanner is already initialized
        if (scannerRef.current) {
          console.log("Scanner already initialized");
          return;
        }

        console.log("Initializing scanner...");
        scannerRef.current = new Html5Qrcode(scannerId);

        // Request camera permission and start scanning
        await scannerRef.current.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            // Use ref to get latest value without re-initializing
            if (!isPausedRef.current) {
              onScanRef.current(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore scanning errors (normal during scanning process)
          }
        );

        if (mounted) {
          console.log("Scanner started successfully");
          setCameraPermission(true);
          setIsInitialized(true);
        }
      } catch (err: any) {
        console.error("Error starting scanner:", err);
        if (mounted) {
          setCameraPermission(false);
          setIsInitialized(false);
        }
      }
    };

    initScanner();

    // Cleanup function
    return () => {
      mounted = false;

      if (scannerRef.current) {
        const scanner = scannerRef.current;

        if (scanner.isScanning) {
          console.log("Stopping scanner...");
          scanner
            .stop()
            .then(() => {
              console.log("Scanner stopped");
              scanner.clear();
              scannerRef.current = null;
            })
            .catch((err) => {
              console.error("Error stopping scanner:", err);
              scannerRef.current = null;
            });
        } else {
          scanner.clear();
          scannerRef.current = null;
        }
      }
    };
  }, []); // Empty dependency array - only run once on mount

  return (
    <div className="relative w-full h-full bg-black overflow-hidden">
      <div id={scannerId} className="w-full h-full object-cover"></div>

      {/* Viewfinder Overlay */}
      <div className="absolute inset-0 border-[50px] border-black/50 pointer-events-none z-10 box-border flex items-center justify-center">
        <div className="w-[250px] h-[250px] border-2 border-white/80 rounded-lg relative">
          {/* Corners */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
        </div>
      </div>

      {/* Loading State */}
      {cameraPermission === null && !isInitialized && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20 bg-black">
          <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-lg font-bold mb-2">Initializing Camera...</p>
          <p className="text-sm text-gray-400">
            Please allow camera access when prompted
          </p>
        </div>
      )}

      {/* Error State */}
      {cameraPermission === false && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-20 bg-black">
          <svg
            className="w-16 h-16 text-red-500 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <p className="text-lg font-bold mb-2">Camera Access Denied</p>
          <p className="text-sm text-gray-400 mb-4">
            Please enable camera permissions in your browser settings to use the
            scanner.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
