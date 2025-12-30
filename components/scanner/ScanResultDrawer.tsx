"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ScanResponse } from "@/app/lib/definitions";
import { useEffect } from "react";
import { clsx } from "clsx";

interface ScanResultDrawerProps {
  result: ScanResponse | null;
  onClose: () => void;
}

export default function ScanResultDrawer({
  result,
  onClose,
}: ScanResultDrawerProps) {
  // Auto-dismiss success after 3 seconds
  useEffect(() => {
    if (result && result.success) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [result, onClose]);

  if (!result) return null;

  const isSuccess = result.success;
  const isDuplicate = !isSuccess && result.error === "ALREADY_USED";
  const isError = !isSuccess && !isDuplicate;

  const bgColor = isSuccess
    ? "bg-success"
    : isDuplicate
    ? "bg-warning"
    : "bg-error";
  const title = isSuccess
    ? "Access Granted"
    : isDuplicate
    ? "Already Checked In"
    : "Access Denied";

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div
            className={clsx(
              "rounded-2xl p-6 text-white shadow-2xl overflow-hidden relative",
              bgColor
            )}
          >
            <div className="flex flex-col items-center justify-center text-center space-y-3">
              {/* Icon */}
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                {isSuccess && (
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
                {isDuplicate && (
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                )}
                {isError && (
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
              </div>

              {/* Text */}
              <h2 className="text-2xl font-bold">{title}</h2>

              {isSuccess && (
                <div className="bg-white/10 rounded-lg p-3 w-full">
                  <p className="opacity-80 uppercase tracking-wider text-xs font-semibold">
                    Attendee
                  </p>
                  <p className="text-xl font-semibold">{result.ticket.name}</p>
                  <div className="h-px bg-white/20 my-2" />
                  <p className="opacity-80 uppercase tracking-wider text-xs font-semibold">
                    Type
                  </p>
                  <p className="text-lg">{result.ticket.type}</p>
                </div>
              )}

              {isDuplicate && result.details?.checkInTime && (
                <div className="bg-black/10 rounded-lg p-3 w-full">
                  <p className="text-sm opacity-90">Checked in at:</p>
                  <p className="text-lg font-mono font-bold">
                    {new Date(result.details.checkInTime).toLocaleTimeString(
                      [],
                      { hour: "2-digit", minute: "2-digit" }
                    )}
                  </p>
                </div>
              )}

              {isError && (
                <div className="bg-black/10 rounded-lg p-3 w-full">
                  <p className="font-semibold text-lg">
                    {result.error.replace("_", " ")}
                  </p>
                  {result.error === "WRONG_EVENT" && (
                    <p className="text-sm opacity-90">
                      Ticket is not for this event
                    </p>
                  )}
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="mt-4 bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:bg-white/90 w-full"
              >
                Scan Next
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
