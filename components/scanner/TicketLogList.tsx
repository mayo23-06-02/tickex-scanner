"use client";

import { TicketLogItem } from "@/app/lib/definitions";
import { useState } from "react";
import TicketDetailsModal from "./TicketDetailsModal";

interface TicketLogListProps {
  logs: TicketLogItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onExport?: () => void;
}

export default function TicketLogList({
  logs,
  isLoading,
  onRefresh,
}: TicketLogListProps) {
  const [selectedTicket, setSelectedTicket] = useState<TicketLogItem | null>(
    null
  );

  return (
    <>
      <div className="w-full h-full flex flex-col bg-[#F5F5F5] animate-in fade-in duration-300">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-[#333333] mb-1">
                Recent Scans
              </h2>
              <p className="text-sm text-gray-500">Latest check-in activity</p>
            </div>
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7A3FFF] to-[#C86DD7] text-white rounded-xl font-medium disabled:opacity-50 hover:opacity-90 transition-all shadow-lg shadow-[#7A3FFF]/20"
            >
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
              {isLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 pb-24">
          {isLoading && logs.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-white rounded-2xl animate-pulse shadow-sm"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelectedTicket(log)}
                  className="w-full bg-white rounded-2xl p-5 flex items-center justify-between hover:shadow-lg transition-all text-left group border border-gray-100 hover:border-[#7A3FFF]/20"
                >
                  {/* Left Section */}
                  <div className="flex items-center gap-4 flex-1">
                    {/* Avatar/Icon */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7A3FFF] to-[#C86DD7] flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-[#333333] group-hover:text-[#7A3FFF] transition-colors truncate">
                        {log.attendeeName}
                      </p>
                      <p className="text-sm text-gray-600 truncate">
                        {log.ticketType}
                      </p>
                      {log.buyerName && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">
                          Purchased by: {log.buyerName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Section */}
                  <div className="text-right flex-shrink-0 ml-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#27AE60]/10 text-[#27AE60] text-xs font-semibold rounded-lg mb-1">
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {new Date(log.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                    <p className="text-xs text-gray-400 font-mono">
                      ••• {log.ticketCode.slice(-4)}
                    </p>
                  </div>
                </button>
              ))}

              {logs.length === 0 && (
                <div className="text-center py-20">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
                    <svg
                      className="w-8 h-8 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">
                    No scans recorded yet
                  </p>
                  <p className="text-sm text-gray-400 mt-1">
                    Scanned tickets will appear here
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <TicketDetailsModal
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />
    </>
  );
}
