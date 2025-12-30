"use client";

import { EventSummary } from "@/app/lib/definitions";
import { clsx } from "clsx";
import { motion } from "framer-motion";

interface EventSelectorProps {
  events: EventSummary[];
  onSelect: (eventId: string) => void;
  isLoading?: boolean;
}

export default function EventSelector({
  events,
  onSelect,
  isLoading,
}: EventSelectorProps) {
  // Group events by status (Active vs Past) could be an enhancement,
  // currently just listing them beautifully.

  return (
    <div className="flex flex-col h-full bg-linear-to-b from-blue-900 to-blue-200 p-6 text-white">
      <div className="mb-8 mt-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-blue-500">
            Select Event
          </h1>
          <p className="text-gray-100 mt-2 text-sm">
            Choose an event to start scanning tickets.
          </p>
        </motion.div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-32 bg-white/5 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      ) : (
        <motion.div
          className="space-y-4 overflow-y-auto pb-20 no-scrollbar"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.1 },
            },
          }}
        >
          {events.map((event) => {
            const percentage =
              event.stats.total > 0
                ? Math.round((event.stats.checkedIn / event.stats.total) * 100)
                : 0;

            return (
              <motion.button
                key={event.id}
                onClick={() => onSelect(event.id)}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  show: { opacity: 1, y: 0 },
                }}
                className="group relative w-full text-left bg-gray-900/50 hover:bg-gray-00 border border-white/10 hover:border-blue-500/50 p-5 rounded-2xl transition-all duration-300 shadow-lg hover:shadow-blue-500/10 overflow-hidden"
              >
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-linear-to-b from-blue-500 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                      {event.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-400">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {event.date
                        ? new Date(event.date).toLocaleDateString(undefined, {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Date TBA"}
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                    <span>Check-in Progress</span>
                    <span className="text-white">{percentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-blue-500 to-cyan-500 transition-all duration-1000 ease-out"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center mt-2 text-xs">
                    <span className="text-blue-400 font-mono bg-blue-400/10 px-2 py-0.5 rounded">
                      {event.stats.checkedIn.toLocaleString()} In
                    </span>
                    <span className="text-gray-500">
                      {event.stats.total.toLocaleString()} Total
                    </span>
                  </div>
                </div>
              </motion.button>
            );
          })}

          {events.length === 0 && (
            <div className="text-center py-20 px-6">
              <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-white">
                No Upcoming Events
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                You don't have any events scheduled. Create one in the dashboard
                to get started.
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
