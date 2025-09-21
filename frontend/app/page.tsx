'use client';

import Link from 'next/link';

// --- Icon Components ---

const ChartBarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const DocumentTextIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2h8a2 2 0 002-2v-1a2 2 0 012-2h1.945M7.735 4.055A8.001 8.001 0 004 11v3a2 2 0 002 2h12a2 2 0 002-2v-3a8.001 8.001 0 00-3.735-6.945M12 2a8.001 8.001 0 016.945 4.055" />
    </svg>
);


export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 md:p-12 text-white">
      <div className="container mx-auto text-center">

        {/* --- Hero Section --- */}
        <div className="py-16 md:py-24">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-4">
            Analyze Your SSC Mocks, <br/>
            <span className="text-indigo-400">Master Your Mistakes.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Stop just taking mocks. Start understanding them. Turn your weaknesses into strengths with in-depth performance analysis and tracking.
          </p>
          <Link href="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105">
              Go to Dashboard
          </Link>
        </div>

        {/* --- Features Section --- */}
        <div className="py-16 md:py-24 border-t border-gray-800">
          <h2 className="text-3xl md:text-4xl font-bold mb-12">Why Use SSC Mock Analyzer?</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
              <ChartBarIcon />
              <h3 className="text-2xl font-semibold mb-3">In-Depth Analytics</h3>
              <p className="text-gray-400">
                Visualize your progress with detailed reports, sectional breakdowns, and performance trends over time. Identify your strong and weak areas at a glance.
              </p>
            </div>
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
              <DocumentTextIcon />
              <h3 className="text-2xl font-semibold mb-3">Manual & Easy Import</h3>
              <p className="text-gray-400">
                Quickly add your mock scores using our simple form or automatically import your entire performance history from platforms like Testbook.
              </p>
            </div>
            <div className="bg-gray-800 p-8 rounded-xl shadow-lg">
              <GlobeIcon />
              <h3 className="text-2xl font-semibold mb-3">Track Every Mistake</h3>
              <p className="text-gray-400">
                Log every mistake you make, categorize them, and track your improvement. Our tool helps you learn from your errors so you don't repeat them.
              </p>
            </div>
          </div>
        </div>

        {/* --- How It Works Section --- */}
        <div className="py-16 md:py-24 border-t border-gray-800">
            <h2 className="text-3xl md:text-4xl font-bold mb-12">Get Started in 3 Simple Steps</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left max-w-5xl mx-auto">
                <div className="relative">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <p className="text-indigo-400 font-bold text-lg mb-2">Step 1</p>
                        <h3 className="font-semibold mb-2">Add Your Mock</h3>
                        <p className="text-sm text-gray-400">Enter your score manually or paste a Testbook URL to import it instantly.</p>
                    </div>
                </div>
                <div className="relative">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <p className="text-indigo-400 font-bold text-lg mb-2">Step 2</p>
                        <h3 className="font-semibold mb-2">Analyze the Data</h3>
                        <p className="text-sm text-gray-400">Head to the dashboard to see your overall stats and a log of all your mocks.</p>
                    </div>
                </div>
                 <div className="relative">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <p className="text-indigo-400 font-bold text-lg mb-2">Step 3</p>
                        <h3 className="font-semibold mb-2">View Detailed Reports</h3>
                        <p className="text-sm text-gray-400">Click on any mock to see a detailed breakdown or view the full performance report.</p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </main>
  );
}