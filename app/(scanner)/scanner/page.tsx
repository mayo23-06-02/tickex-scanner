"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getScannerEvents,
  verifyTicket,
  getEventLogs,
  exportEventLogs,
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
  const [eventLoadError, setEventLoadError] = useState<string | null>(null);

  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("scan");
  const [isScannerActive, setIsScannerActive] = useState(true);
  const [scanCount, setScanCount] = useState(0);

  // Logs State
  const [logs, setLogs] = useState<TicketLogItem[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentScans, setRecentScans] = useState<string[]>([]);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Show notification
  const showNotification = useCallback(
    (type: "success" | "error" | "info", message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
    },
    []
  );

  // 1. Fetch Events on Mount
  useEffect(() => {
    async function loadEvents() {
      try {
        setIsLoadingEvents(true);
        setEventLoadError(null);
        const data = await getScannerEvents();
        setEvents(data);

        // Auto-select first event if only one exists
        if (data.length === 1) {
          setCurrentEvent(data[0]);
          showNotification("success", `Selected: ${data[0].name}`);
        }
      } catch (e) {
        console.error("Failed to load events", e);
        setEventLoadError(
          "Failed to load events. Please check your connection."
        );
        showNotification("error", "Could not load events");
      } finally {
        setIsLoadingEvents(false);
      }
    }
    loadEvents();
  }, [showNotification]);

  // Fetch Logs
  const fetchLogs = useCallback(
    async (forceRefresh = false) => {
      if (!currentEvent) return;

      if (logs.length > 0 && !forceRefresh) return;

      setIsLoadingLogs(true);
      try {
        const data = await getEventLogs(currentEvent.id);
        setLogs(data);
        showNotification("success", `Loaded ${data.length} log entries`);
      } catch (e) {
        console.error("Failed to load logs", e);
        showNotification("error", "Failed to load logs");
      } finally {
        setIsLoadingLogs(false);
      }
    },
    [currentEvent, logs.length, showNotification]
  );

  // Export logs as CSV
  const handleExportLogs = useCallback(async () => {
    if (!currentEvent || logs.length === 0) return;

    setIsExporting(true);
    try {
      const csvData = await exportEventLogs(currentEvent.id);

      // Create and trigger download
      const blob = new Blob([csvData], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${currentEvent.name.replace(/\s+/g, "_")}_logs_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showNotification("success", "Logs exported successfully");
    } catch (e) {
      console.error("Failed to export logs", e);
      showNotification("error", "Failed to export logs");
    } finally {
      setIsExporting(false);
    }
  }, [currentEvent, logs, showNotification]);

  // Load logs when switching to logs view
  useEffect(() => {
    if (viewMode === "logs") {
      fetchLogs();
    }
  }, [viewMode, fetchLogs]);

  // Handle Scan Logic
  const handleScan = useCallback(
    async (code: string) => {
      // Prevent duplicate scans within 2 seconds
      if (
        recentScans.includes(code) &&
        Date.now() - recentScans.indexOf(code) < 2000
      ) {
        console.log("Duplicate scan prevented:", code);
        return;
      }

      if (!currentEvent || isProcessing || scanResult) return;

      setIsProcessing(true);
      setRecentScans((prev) => [...prev.slice(-10), code]);

      try {
        const organizerId = "mock-organizer-id";
        const response = await verifyTicket(code, currentEvent.id, organizerId);

        setScanResult(response);
        setScanCount((prev) => prev + 1);

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

          showNotification(
            "success",
            `Ticket scanned: ${response.ticket.ticketNumber}`
          );

          // Auto-clear success scan after 2 seconds
          if (response.success) {
            setTimeout(() => {
              setScanResult(null);
            }, 2000);
          }
        } else {
          showNotification("error", response.message || "Scan failed");
        }
      } catch (err) {
        console.error("Scan error", err);
        showNotification("error", "Network error during scan");
      } finally {
        setIsProcessing(false);
      }
    },
    [currentEvent, isProcessing, scanResult, recentScans, showNotification]
  );

  const resetScanner = () => {
    setScanResult(null);
  };

  // Toggle scanner on/off
  const toggleScanner = useCallback(() => {
    setIsScannerActive((prev) => !prev);
    showNotification(
      "info",
      `Scanner ${!isScannerActive ? "activated" : "paused"}`
    );
  }, [isScannerActive, showNotification]);

  // Handle view mode change
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
  }, []);

  // Quick stats for logs badge
  const logStats = useMemo(() => {
    if (!currentEvent) return { success: 0, failed: 0 };

    const successLogs = logs.filter((log) => log.status === "checked_in");
    const failedLogs = logs.filter(
      (log) => log.status === "invalid" || log.status === "already_used"
    );

    return {
      success: successLogs.length,
      failed: failedLogs.length,
    };
  }, [logs, currentEvent]);

  // If no event selected, show selector
  if (!currentEvent) {
    return (
      <>
        <EventSelector
          events={events}
          isLoading={isLoadingEvents}
          error={eventLoadError}
          onSelect={(id) => {
            const evt = events.find((e) => e.id === id);
            if (evt) {
              setCurrentEvent(evt);
              showNotification("success", `Selected: ${evt.name}`);
            }
          }}
        />
        {notification && (
          <div
            className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg ${
              notification.type === "success"
                ? "bg-green-500 text-white"
                : notification.type === "error"
                ? "bg-red-500 text-white"
                : "bg-blue-500 text-white"
            }`}
          >
            {notification.message}
          </div>
        )}
      </>
    );
  }

  return (
    <div className="relative h-screen flex flex-col bg-black overflow-hidden">
      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg animate-fade-in ${
            notification.type === "success"
              ? "bg-green-500 text-white"
              : notification.type === "error"
              ? "bg-red-500 text-white"
              : "bg-blue-500 text-white"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black/95 to-black/80 backdrop-blur-lg border-b border-white/10">
        <div className="flex items-center justify-between p-4">
          {/* Left: Event info */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentEvent(null)}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors group"
              title="Switch event"
            >
              <svg
                className="w-5 h-5 text-gray-300 group-hover:text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16l-4-4m0 0l4-4m-4 4h18"
                />
              </svg>
            </button>

            <div className="min-w-0">
              <h1 className="font-bold text-lg text-white truncate">
                {currentEvent.name}
              </h1>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="font-mono bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">
                  {currentEvent.stats.checkedIn}/{currentEvent.stats.total}
                </span>
                <span>checked in</span>
              </div>
            </div>
          </div>

          {/* Right: Stats and Controls */}
          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-white font-bold">
                  {currentEvent.stats.total}
                </div>
                <div className="text-gray-400 text-xs">Total</div>
              </div>
              <div className="text-center">
                <div className="text-emerald-400 font-bold">
                  {currentEvent.stats.checkedIn}
                </div>
                <div className="text-gray-400 text-xs">Checked In</div>
              </div>
              <div className="text-center">
                <div className="text-cyan-400 font-bold">{scanCount}</div>
                <div className="text-gray-400 text-xs">Today</div>
              </div>
            </div>

            {/* Scanner Control */}
            {viewMode === "scan" && (
              <button
                onClick={toggleScanner}
                disabled={isProcessing}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2",
                  isScannerActive
                    ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                )}
              >
                {isScannerActive ? (
                  <>
                    <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse"></div>
                    Pause
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                    Resume
                  </>
                )}
              </button>
            )}

            {/* Switch Event Button */}
            <button
              onClick={() => setCurrentEvent(null)}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition-colors border border-white/10"
            >
              Switch Event
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        {/* Scan View */}
        {viewMode === "scan" && (
          <div className="relative h-full">
            <QRScanner
              onScan={handleScan}
              isPaused={!!scanResult || isProcessing || !isScannerActive}
              scanDelay={500}
              showTorchControl={true}
              preferredCamera="environment"
            />

            {/* Scanner Status Overlay */}
            {!isScannerActive && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-40">
                <div className="text-center p-6 bg-black/50 rounded-2xl backdrop-blur-sm">
                  <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white font-medium">Scanner Paused</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Press the play button to resume
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Manual Entry View */}
        {viewMode === "manual" && (
          <div className="h-full bg-gradient-to-b from-gray-900 to-black p-4">
            <ManualEntry
              isOpen={true}
              onSubmit={handleScan}
              isLoading={isProcessing}
            />
          </div>
        )}

        {/* Logs View */}
        {viewMode === "logs" && (
          <div className="h-full flex flex-col">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-900/50 to-black/50 border-b border-white/10">
              <div>
                <h2 className="font-semibold text-white">Scan Logs</h2>
                <p className="text-sm text-gray-400">
                  {logs.length} entries • {logStats.success} successful •{" "}
                  {logStats.failed} failed
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => fetchLogs(true)}
                  disabled={isLoadingLogs}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isLoadingLogs ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Loading...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                        />
                      </svg>
                      Refresh
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportLogs}
                  disabled={isExporting || logs.length === 0}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Export CSV
                    </>
                  )}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <TicketLogList
                logs={logs}
                isLoading={isLoadingLogs}
                onRefresh={() => fetchLogs(true)}
                onExport={handleExportLogs}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="sticky bottom-0 z-40 bg-gray-900/95 backdrop-blur-lg border-t border-white/10 safe-area-bottom">
        <div className="flex justify-around items-center p-2">
          {/* Scan Tab */}
          <button
            onClick={() => handleViewModeChange("scan")}
            className={clsx(
              "flex flex-col items-center gap-1 p-3 rounded-xl min-w-[80px] transition-all relative",
              viewMode === "scan"
                ? "text-emerald-400 bg-emerald-500/10"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className="relative">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={viewMode === "scan" ? 2 : 1.5}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              {viewMode === "scan" && isScannerActive && (
                <div className="absolute -top-1 -right-1 w-3 h-3">
                  <div className="w-full h-full bg-emerald-400 rounded-full animate-pulse"></div>
                </div>
              )}
            </div>
            <span className="text-xs font-medium">Scan</span>
          </button>

          {/* Manual Tab */}
          <button
            onClick={() => handleViewModeChange("manual")}
            className={clsx(
              "flex flex-col items-center gap-1 p-3 rounded-xl min-w-[80px] transition-all",
              viewMode === "manual"
                ? "text-cyan-400 bg-cyan-500/10"
                : "text-gray-400 hover:text-white hover:bg-white/5"
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
                strokeWidth={viewMode === "manual" ? 2 : 1.5}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span className="text-xs font-medium">Manual</span>
          </button>

          {/* Logs Tab with Badge */}
          <button
            onClick={() => handleViewModeChange("logs")}
            className={clsx(
              "flex flex-col items-center gap-1 p-3 rounded-xl min-w-[80px] transition-all relative",
              viewMode === "logs"
                ? "text-purple-400 bg-purple-500/10"
                : "text-gray-400 hover:text-white hover:bg-white/5"
            )}
          >
            <div className="relative">
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={viewMode === "logs" ? 2 : 1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              {logs.length > 0 && viewMode !== "logs" && (
                <span className="absolute -top-1 -right-1 bg-purple-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {logs.length > 99 ? "99+" : logs.length}
                </span>
              )}
            </div>
            <span className="text-xs font-medium">Logs</span>
          </button>
        </div>
      </div>

      {/* Scanner Controls Floating Button */}
      {viewMode === "scan" && (
        <div className="fixed bottom-20 right-4 z-30">
          <button
            onClick={toggleScanner}
            className={clsx(
              "p-4 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95",
              isScannerActive
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            )}
            title={isScannerActive ? "Pause Scanner" : "Resume Scanner"}
          >
            {isScannerActive ? (
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
                  d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
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
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Result Drawer */}
      <ScanResultDrawer result={scanResult} onClose={resetScanner} />
    </div>
  );
}
