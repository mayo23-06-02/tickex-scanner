import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7A3FFF] via-[#C86DD7] to-[#7A3FFF] flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Phone Mockup Container */}
        <div className="bg-white rounded-[3rem] shadow-2xl overflow-hidden">
          {/* Top Section - Dark */}
          <div className="bg-gradient-to-b from-gray-900 to-gray-800 pt-12 pb-32 px-8 relative">
            {/* Status Bar Simulation */}
            <div className="flex justify-between items-center mb-12 text-white/60 text-xs">
              <span>9:41</span>
              <div className="flex gap-1">
                <div className="w-4 h-4 border border-white/60 rounded-sm"></div>
                <div className="w-4 h-4 border border-white/60 rounded-sm"></div>
              </div>
            </div>

            {/* QR Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <svg
                  className="w-32 h-32 text-white"
                  viewBox="0 0 100 100"
                  fill="currentColor"
                >
                  {/* QR Code Icon */}
                  <rect x="10" y="10" width="15" height="15" rx="2" />
                  <rect x="30" y="10" width="15" height="15" rx="2" />
                  <rect x="50" y="10" width="15" height="15" rx="2" />
                  <rect x="75" y="10" width="15" height="15" rx="2" />

                  <rect x="10" y="30" width="15" height="15" rx="2" />
                  <rect x="50" y="30" width="15" height="15" rx="2" />
                  <rect x="75" y="30" width="15" height="15" rx="2" />

                  <rect x="10" y="50" width="15" height="15" rx="2" />
                  <rect x="30" y="50" width="15" height="15" rx="2" />
                  <rect x="75" y="50" width="15" height="15" rx="2" />

                  <rect x="10" y="75" width="15" height="15" rx="2" />
                  <rect x="30" y="75" width="15" height="15" rx="2" />
                  <rect x="50" y="75" width="15" height="15" rx="2" />
                  <rect x="75" y="75" width="15" height="15" rx="2" />

                  {/* Corner Squares */}
                  <rect x="12" y="12" width="4" height="4" fill="white" />
                  <rect x="77" y="12" width="4" height="4" fill="white" />
                  <rect x="12" y="77" width="4" height="4" fill="white" />
                </svg>

                {/* Scan Frame Corners */}
                <div className="absolute -top-4 -left-4 w-12 h-12 border-l-4 border-t-4 border-[#FFD700] rounded-tl-2xl"></div>
                <div className="absolute -top-4 -right-4 w-12 h-12 border-r-4 border-t-4 border-[#FFD700] rounded-tr-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 border-l-4 border-b-4 border-[#FFD700] rounded-bl-2xl"></div>
                <div className="absolute -bottom-4 -right-4 w-12 h-12 border-r-4 border-b-4 border-[#FFD700] rounded-br-2xl"></div>
              </div>
            </div>
          </div>

          {/* Bottom Section - White Card */}
          <div className="bg-white -mt-20 rounded-t-[2.5rem] px-8 pt-12 pb-8 relative z-10">
            <h1 className="text-3xl font-bold text-[#333333] mb-3">
              Get Started
            </h1>
            <p className="text-gray-600 text-sm leading-relaxed mb-8">
              Your all-in-one solution for scanning and generating QR
              codes—fast, easy, and secure.
            </p>

            {/* CTA Button */}
            <Link
              href="/scanner"
              className="group relative w-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] hover:from-[#FFA500] hover:to-[#FFD700] text-gray-900 font-bold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="text-lg">Launch Scanner</span>
              <svg
                className="w-6 h-6 group-hover:translate-x-1 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </Link>

            {/* Features */}
            <div className="mt-8 grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-br from-[#7A3FFF]/10 to-[#C86DD7]/10 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#7A3FFF]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <span className="text-xs text-gray-600 font-medium">Fast</span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-br from-[#7A3FFF]/10 to-[#C86DD7]/10 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#7A3FFF]"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <span className="text-xs text-gray-600 font-medium">
                  Secure
                </span>
              </div>
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-br from-[#7A3FFF]/10 to-[#C86DD7]/10 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-[#7A3FFF]"
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
                <span className="text-xs text-gray-600 font-medium">Easy</span>
              </div>
            </div>
          </div>
        </div>

        {/* Branding */}
        <div className="text-center mt-8">
          <p className="text-white/90 font-bold text-2xl tracking-tight">
            Tickex Scanner
          </p>
          <p className="text-white/60 text-sm mt-1">
            Professional Event Management
          </p>
        </div>
      </div>
    </div>
  );
}
