"use client";

import { TicketLogItem } from "@/app/lib/definitions";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface TicketDetailsModalProps {
  ticket: TicketLogItem | null;
  onClose: () => void;
}

export default function TicketDetailsModal({
  ticket,
  onClose,
}: TicketDetailsModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (ticket) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [ticket]);

  if (!mounted || !ticket) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7A3FFF] to-[#C86DD7] mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#333333] mb-1">
            Ticket Details
          </h2>
          <p className="text-sm text-gray-500">Scan Information</p>
        </div>

        {/* Main Info Card */}
        <div className="bg-gradient-to-br from-[#7A3FFF]/5 to-[#C86DD7]/5 rounded-2xl p-5 mb-4 border border-[#7A3FFF]/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-[#7A3FFF] uppercase tracking-wider">
              Attendee
            </span>
            <span className="px-3 py-1 bg-[#27AE60]/10 text-[#27AE60] text-xs font-semibold rounded-full">
              {ticket.status.replace("_", " ").toUpperCase()}
            </span>
          </div>
          <p className="text-xl font-bold text-[#333333] mb-1">
            {ticket.attendeeName}
          </p>
          <p className="text-sm text-gray-600">{ticket.ticketType}</p>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 mb-4">
          <div className="bg-[#F5F5F5] rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Ticket ID
              </span>
              <span className="text-xs font-mono text-gray-700">
                {ticket.ticketCode.substring(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Order ID
              </span>
              <span className="text-xs font-mono text-gray-700">
                {ticket.orderId.substring(0, 12)}...
              </span>
            </div>
            <div className="flex justify-between items-center mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Scanned At
              </span>
              <span className="text-xs font-medium text-gray-700">
                {new Date(ticket.timestamp).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-medium text-gray-500 uppercase">
                Purchased
              </span>
              <span className="text-xs font-medium text-gray-700">
                {ticket.purchaseDate}
              </span>
            </div>
          </div>

          {/* Buyer Info */}
          {(ticket.buyerName || ticket.buyerEmail) && (
            <div className="bg-gradient-to-br from-[#C86DD7]/5 to-[#7A3FFF]/5 rounded-xl p-4 border border-[#C86DD7]/20">
              <p className="text-xs font-semibold text-[#7A3FFF] uppercase tracking-wider mb-3">
                Buyer Information
              </p>
              {ticket.buyerName && (
                <p className="text-sm font-semibold text-[#333333] mb-1">
                  {ticket.buyerName}
                </p>
              )}
              {ticket.buyerEmail && (
                <p className="text-xs text-gray-600">{ticket.buyerEmail}</p>
              )}
            </div>
          )}
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full bg-gradient-to-r from-[#7A3FFF] to-[#C86DD7] hover:opacity-90 text-white py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-[#7A3FFF]/20"
        >
          Close
        </button>
      </div>
    </div>,
    document.body
  );
}
