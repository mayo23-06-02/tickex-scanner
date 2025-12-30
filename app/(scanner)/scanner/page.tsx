"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getScannerEvents,
  verifyTicket,
  getEventLogs,
} from "@/app/actions/scanner";
import {
  EventSummary,
  ScanResponse,
  TicketLogItem,
} from "@/app/lib/definitions";
import EventSelector from "@/components/scanner/EventSelector";
import QRScanner from "@/components/scanner/QRScanner";
import ScanResultDrawer from "@/components/scanner/ScanResultDrawer";
import ManualEntry from "@/components/scanner/ManualEntry";
import TicketLogList from "@/components/scanner/TicketLogList";
import { clsx } from "clsx";

type ViewMode = "scan" | "manual" | "logs";

export default function ScannerPage() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [currentEvent, setCurrentEvent] = useState<EventSummary | null>(null);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);

  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("scan");

  // Logs State
  const [logs, setLogs] = useState<TicketLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Pause scanner when drawer is open or manual entry is open or processing
  const [isProcessing, setIsProcessing] = useState(false);

  // 1. Fetch Events on Mount
  useEffect(() => {
    async function loadEvents() {
      try {
        const data = await getScannerEvents();
        setEvents(data);
      } catch (e) {
        console.error("Failed to load events", e);
      } finally {
        setIsLoadingEvents(false);
      }
    }
    loadEvents();
  }, []);

  // Fetch Logs
  const fetchLogs = useCallback(async () => {
    if (!currentEvent) return;
    setIsLoadingLogs(true);
    try {
      const data = await getEventLogs(currentEvent.id);
      setLogs(data);
    } catch (e) {
      console.error("Failed logs", e);
    } finally {
      setIsLoadingLogs(false);
    }
  }, [currentEvent]);

  // Load logs when switching to logs view
  useEffect(() => {
    if (viewMode === "logs") {
      fetchLogs();
    }
  }, [viewMode, fetchLogs]);

  // 2. Handle Scan Logic
  const handleScan = useCallback(
    async (code: string) => {
      if (!currentEvent || isProcessing || scanResult) return;

      setIsProcessing(true);

      try {
        // In a real app, get valid organizer ID from session
        const organizerId = "mock-organizer-id";
        const response = await verifyTicket(code, currentEvent.id, organizerId);

        setScanResult(response);

        // Update local stats if successful
        if (response.success && response.ticket) {
          setCurrentEvent((prev) =>
            prev
              ? {
                  ...prev,
                  stats: {
                    ...prev.stats,
                    checkedIn: prev.stats.checkedIn + 1,
                  },
                }
              : null
          );
        }
      } catch (err) {
        console.error("Scan error", err);
      } finally {
        setIsProcessing(false);
      }
    },
    [currentEvent, isProcessing, scanResult]
  );

  const resetScanner = () => {
    setScanResult(null);
  };

  // If no event selected, show selector
  if (!currentEvent) {
    return (
      <EventSelector
        events={events}
        isLoading={isLoadingEvents}
        onSelect={(id) => {
          const evt = events.find((e) => e.id === id);
          if (evt) setCurrentEvent(evt);
        }}
      />
    );
  }

  return (
    <div className="relative h-screen flex flex-col bg-black overflow-hidden">
      {/* Header / Stats Overlay - Only show in scan/manual modes */}
      {viewMode !== "logs" && (
        <div className="absolute top-0 left-0 right-0 z-30 p-4 pt-6 bg-linear-to-b from-black/80 to-transparent text-white flex justify-between items-start pointer-events-none">
          <div>
            <h2 className="font-bold text-lg drop-shadow-md">
              {currentEvent.name}
            </h2>
            <div className="flex items-center gap-2 text-sm opacity-90 drop-shadow-md">
              <span className="font-mono bg-emerald-500/20 text-emerald-400 px-1.5 rounded">
                {currentEvent.stats.checkedIn}
              </span>
              <span>/ {currentEvent.stats.total} Checked In</span>
            </div>
          </div>
          <button
            onClick={() => setCurrentEvent(null)}
            className="pointer-events-auto bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full text-xs font-semibold backdrop-blur-md transition-colors border border-white/10"
          >
            Switch Event
          </button>
        </div>
      )}

      {/* Main View Container */}
      <div className="flex-1 relative flex flex-col">
        {viewMode === "manual" && (
          <ManualEntry isOpen={true} onSubmit={(code) => handleScan(code)} />
        )}

        {viewMode === "scan" && (
          <QRScanner
            onScan={handleScan}
            isPaused={!!scanResult || isProcessing}
          />
        )}

        {viewMode === "logs" && (
          <TicketLogList
            logs={logs}
            isLoading={isLoadingLogs}
            onRefresh={fetchLogs}
          />
        )}
      </div>

      {/* Tab Navigation - Fixed Bottom */}
      <div className="z-30 bg-gray-900 border-t border-white/5 safe-area-bottom">
        <div className="flex justify-around items-center p-2">
          <button
            onClick={() => setViewMode("scan")}
            className={clsx(
              "flex flex-col items-center gap-1 p-3 rounded-xl min-w-[80px] transition-all",
              viewMode === "scan"
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
              />
            </svg>
            <span className="text-xs font-medium">Scan</span>
          </button>

          <button
            onClick={() => setViewMode("manual")}
            className={clsx(
              "flex flex-col items-center gap-1 p-3 rounded-xl min-w-[80px] transition-all",
              viewMode === "manual"
                ? "text-cyan-400 bg-cyan-500/10"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span className="text-xs font-medium">Manual</span>
          </button>

          <button
            onClick={() => setViewMode("logs")}
            className={clsx(
              "flex flex-col items-center gap-1 p-3 rounded-xl min-w-[80px] transition-all",
              viewMode === "logs"
                ? "text-purple-400 bg-purple-500/10"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            <span className="text-xs font-medium">Logs</span>
          </button>
        </div>
      </div>

      {/* Result Drawer */}
      <ScanResultDrawer result={scanResult} onClose={resetScanner} />
    </div>
  );
}
