"use client";

import { useState } from "react";
import { clsx } from "clsx";

interface ManualEntryProps {
  onSubmit: (code: string) => void;
  onCancel?: () => void;
  isOpen: boolean;
}

export default function ManualEntry({
  onSubmit,
  onCancel,
  isOpen,
}: ManualEntryProps) {
  const [code, setCode] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length > 0) {
      onSubmit(code.trim());
      setCode("");
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-center px-6 bg-gray-900 animate-in fade-in duration-200">
      <div className="w-full max-w-md mx-auto">
        <h2 className="text-2xl font-bold text-white mb-8 text-center">
          Manual Check-in
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="ticket-code"
              className="block text-sm font-medium text-gray-400 mb-2"
            >
              Enter Ticket Code
            </label>
            <input
              type="text"
              id="ticket-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. 550e8400..."
              className="w-full p-4 text-center text-xl border border-gray-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none uppercase font-mono bg-gray-800 text-white placeholder:text-gray-600 transition-all shadow-inner"
              autoFocus
              autoComplete="off"
            />
          </div>

          <button
            type="submit"
            disabled={code.length === 0}
            className="w-full bg-linear-to-r from-emerald-500 to-cyan-500 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-lg hover:shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-all"
          >
            Check In
          </button>
        </form>

        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full mt-6 py-4 text-gray-500 font-medium hover:text-white transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
