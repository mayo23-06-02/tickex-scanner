"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  Html5Qrcode,
  Html5QrcodeSupportedFormats,
  Html5QrcodeCameraScanConfig,
} from "html5-qrcode";

interface QRScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
  isPaused?: boolean;
  scanDelay?: number;
  showTorchControl?: boolean;
  preferredCamera?: "environment" | "user";
}

export default function QRScanner({
  onScan,
  onError,
  isPaused = false,
  scanDelay = 500,
  showTorchControl = false,
  preferredCamera = "environment",
}: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(
    null
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
    []
  );
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);

  const onScanRef = useRef(onScan);
  const isPausedRef = useRef(isPaused);
  const lastScanTimeRef = useRef<number>(0);
  const scannerStateRef = useRef<"idle" | "starting" | "scanning" | "stopping">(
    "idle"
  );
  const isMountedRef = useRef(false);
  const scannerId = "qr-scanner-container";

  // Configurable scanner settings
  const scannerConfig: Html5QrcodeCameraScanConfig = {
    fps: 15,
    qrbox: { width: 250, height: 250 },
    aspectRatio: 1.0,
    disableFlip: false,
    videoConstraints: {
      facingMode: preferredCamera,
      width: { min: 640, ideal: 1280, max: 1920 },
      height: { min: 480, ideal: 720, max: 1080 },
    },
  };

  // Keep refs updated
  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  // Track mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Get available cameras
  const getAvailableCameras = useCallback(async () => {
    if (!navigator.mediaDevices) return [];
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(
        (device) => device.kind === "videoinput"
      );
      if (isMountedRef.current) {
        setAvailableCameras(videoDevices);
      }
      return videoDevices;
    } catch (error) {
      console.warn("Could not enumerate cameras:", error);
      return [];
    }
  }, []);

  // Initialize scanner
  const initScanner = useCallback(async () => {
    if (scannerRef.current) {
      return scannerRef.current;
    }

    try {
      const scanner = new Html5Qrcode(scannerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.AZTEC,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
        verbose: false,
      });

      scannerRef.current = scanner;
      return scanner;
    } catch (error) {
      console.error("Failed to create scanner:", error);
      onError?.("Failed to initialize scanner");
      return null;
    }
  }, [onError]);

  // Stop scanning
  const stopScanner = useCallback(async () => {
    if (!scannerRef.current) return;

    // If already stopping, wait or ignore
    if (scannerStateRef.current === "stopping") return;

    // We can only stop if we are scanning or starting (logic dependent)
    // But safely, we should only call stop if the lib thinks it's scanning
    try {
      scannerStateRef.current = "stopping";

      // Check internal state of library if possible, or trust our logic
      // Html5Qrcode throws if you call stop() when not scanning
      if (scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }

      // Clear element to remove video tag
      // Note: clear() can fail if operations are pending
      try {
        await scannerRef.current.clear();
      } catch (e) {
        console.debug("Clear failed (harmless):", e);
      }
    } catch (error) {
      console.warn("Error stopping scanner:", error);
    } finally {
      scannerStateRef.current = "idle";
      if (isMountedRef.current) {
        setIsScanning(false);
      }
    }
  }, []);

  // Start scanning
  const startScanner = useCallback(
    async (cameraId?: string) => {
      if (!isMountedRef.current) return false;

      // Prevent re-entry if busy
      if (
        scannerStateRef.current === "starting" ||
        scannerStateRef.current === "stopping"
      ) {
        console.log("Scanner is busy, skipping start request");
        return false;
      }

      const scanner = await initScanner();
      if (!scanner) return false;

      try {
        scannerStateRef.current = "starting";

        // If scanning, stop first
        if (scanner.isScanning) {
          await scanner.stop();
        }

        const startConfig = cameraId
          ? { deviceId: { exact: cameraId } }
          : { facingMode: preferredCamera };

        await scanner.start(
          startConfig,
          scannerConfig,
          (decodedText) => {
            const now = Date.now();
            if (now - lastScanTimeRef.current < scanDelay) {
              return;
            }
            lastScanTimeRef.current = now;
            if (!isPausedRef.current) {
              setScanResult(decodedText);
              onScanRef.current(decodedText);
            }
          },
          (errorMessage) => {
            // Ignore errors
          }
        );

        scannerStateRef.current = "scanning";

        if (isMountedRef.current) {
          setIsScanning(true);
          setCameraPermission(true);
          setIsInitialized(true);

          if (cameraId) {
            setActiveCameraId(cameraId);
          } else {
            // Fetch cameras to update state
            getAvailableCameras().then((cams) => {
              if (cams.length > 0 && isMountedRef.current) {
                setActiveCameraId(cams[0].deviceId);
              }
            });
          }
        }
        return true;
      } catch (error: any) {
        console.error("Error starting scanner:", error);
        scannerStateRef.current = "idle"; // Reset on failure

        if (isMountedRef.current) {
          setCameraPermission(false);
          setIsScanning(false);

          let errorMessage = "Failed to start camera";
          if (error?.name === "NotAllowedError") {
            errorMessage = "Camera permission denied";
          } else if (error?.name === "NotFoundError") {
            errorMessage = "No camera found";
          } else if (error?.name === "NotReadableError") {
            errorMessage = "Camera is in use by another application";
          }
          onError?.(errorMessage);
        }
        return false;
      }
    },
    [
      preferredCamera,
      scanDelay,
      scannerConfig,
      getAvailableCameras,
      onError,
      initScanner,
    ]
  );

  // Clean initialization
  useEffect(() => {
    let ignore = false;

    const performInit = async () => {
      // Delay slightly to ensure DOM is ready and previous cleanups done
      await new Promise((r) => setTimeout(r, 100));
      if (!ignore && isMountedRef.current) {
        await startScanner();
      }
    };

    performInit();

    return () => {
      ignore = true;
      // Trigger stop on unmount
      if (scannerRef.current) {
        // We can't await here, but we trigger the promise
        stopScanner();
      }
    };
    // scannerConfig is new object every render, so we exclude it (it's constant in effect)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredCamera]);
  // removed startScanner/stopScanner from deps to avoid re-triggering loops logic loops if they change

  // Handle pause state
  useEffect(() => {
    if (isPaused && scanResult) {
      setScanResult(null);
    }
  }, [isPaused, scanResult]);

  // Request permission retry
  const handleRetry = useCallback(async () => {
    setCameraPermission(null);
    setIsInitialized(false);
    await stopScanner();
    await startScanner();
  }, [stopScanner, startScanner]);

  // Switch camera
  const switchCamera = useCallback(
    async (cameraId: string) => {
      if (isSwitchingCamera || !scannerRef.current) return;

      setIsSwitchingCamera(true);
      try {
        await stopScanner();
        const success = await startScanner(cameraId);
        if (success) {
          setActiveCameraId(cameraId);
        }
      } catch (error) {
        console.error("Error switching camera:", error);
      } finally {
        setIsSwitchingCamera(false);
      }
    },
    [stopScanner, startScanner, isSwitchingCamera]
  );

  // Toggle torch (simulated - requires browser support)
  const toggleTorch = useCallback(async () => {
    if (!scannerRef.current || !activeCameraId) return;

    try {
      // Note: Torch control requires specific browser support
      // This is a simplified implementation
      const videoElement = document.querySelector("video");
      if (videoElement) {
        const stream = videoElement.srcObject as MediaStream;
        const track = stream?.getTracks()[0];
        if (track && typeof track.getCapabilities === "function") {
          const capabilities = track.getCapabilities() as any;
          if (capabilities.torch) {
            await track.applyConstraints({
              advanced: [{ torch: !torchEnabled } as any],
            });
            setTorchEnabled(!torchEnabled);
          }
        }
      }
    } catch (error) {
      console.warn("Torch not supported:", error);
    }
  }, [activeCameraId, torchEnabled]);

  // Render camera selector
  const renderCameraSelector = () => {
    if (availableCameras.length <= 1 || !isScanning) return null;

    return (
      <div className="absolute top-4 right-4 z-30">
        <select
          value={activeCameraId || ""}
          onChange={(e) => switchCamera(e.target.value)}
          disabled={isSwitchingCamera}
          className="bg-black/70 text-white px-3 py-2 rounded-lg text-sm border border-white/30 backdrop-blur-sm"
        >
          {availableCameras.map((camera) => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {camera.label || `Camera ${availableCameras.indexOf(camera) + 1}`}
            </option>
          ))}
        </select>
      </div>
    );
  };

  // Render torch control
  const renderTorchControl = () => {
    if (!showTorchControl || !isScanning) return null;

    return (
      <button
        onClick={toggleTorch}
        className="absolute bottom-4 right-4 z-30 bg-black/70 text-white p-3 rounded-full backdrop-blur-sm hover:bg-black/90 transition-all"
        title={torchEnabled ? "Turn off torch" : "Turn on torch"}
      >
        {torchEnabled ? "🔦" : "💡"}
      </button>
    );
  };

  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden"
      ref={scannerContainerRef}
    >
      <div id={scannerId} className="w-full h-full"></div>

      {/* Viewfinder Overlay */}
      <div className="absolute inset-0 border-[50px] border-black/50 pointer-events-none z-10 box-border flex items-center justify-center">
        <div className="w-[250px] h-[250px] border-2 border-white/80 rounded-lg relative">
          {/* Scanning animation */}
          {!isPaused && isScanning && (
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-scan"></div>
          )}

          {/* Corners */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-400 -mt-1 -ml-1"></div>
          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-400 -mt-1 -mr-1"></div>
          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-400 -mb-1 -ml-1"></div>
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-400 -mb-1 -mr-1"></div>
        </div>
      </div>

      {/* Status indicators */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
        {isPaused && (
          <div className="bg-amber-500/90 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
            Scanner paused
          </div>
        )}
        {scanResult && !isPaused && (
          <div className="bg-emerald-500/90 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm animate-pulse">
            ✓ Scan successful
          </div>
        )}
        {isSwitchingCamera && (
          <div className="bg-blue-500/90 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
            Switching camera...
          </div>
        )}
      </div>

      {/* Camera selector */}
      {renderCameraSelector()}

      {/* Torch control */}
      {renderTorchControl()}

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
          <p className="text-sm text-gray-400 mb-6 max-w-md">
            Camera permissions are required to scan QR codes. Please enable
            camera access in your browser settings.
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleRetry}
              className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}

      {/* Manual camera controls */}
      {availableCameras.length > 1 && isScanning && (
        <div className="absolute bottom-4 left-4 z-30 flex gap-2">
          {availableCameras.map((camera, index) => (
            <button
              key={camera.deviceId}
              onClick={() => switchCamera(camera.deviceId)}
              disabled={activeCameraId === camera.deviceId || isSwitchingCamera}
              className={`px-3 py-1 rounded text-sm transition-all ${
                activeCameraId === camera.deviceId
                  ? "bg-emerald-600 text-white"
                  : "bg-black/70 text-white hover:bg-black/90"
              }`}
            >
              Cam {index + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Add CSS for scan animation
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes scan {
      0% { transform: translateY(0); }
      100% { transform: translateY(250px); }
    }
    .animate-scan {
      animation: scan 2s ease-in-out infinite;
    }
  `;
  document.head.appendChild(style);
}
