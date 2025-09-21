'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import MockForm from '../../components/MockForm';
import TestbookImportForm from '../../components/TestbookImportForm';

// --- Type Definitions ---
interface Mock {
  id: number;
  name: string;
  score_overall: number;
  percentile_overall: number;
  date_taken: string;
}

// --- SVG Icons for Buttons ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.998 5.998 0 0116 10c0 .343-.011.683-.034 1.022a2.53 2.53 0 00-1.022-1.022A2.5 2.5 0 0012.5 8 1.5 1.5 0 0111 6.5V6a2 2 0 00-4 0v.5a1.5 1.5 0 01-1.5 1.5/8c-.526 0-.988-.27-1.256-.703a6.002 6.002 0 01-1.912-2.706zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
    </svg>
);


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const DashboardPage = () => {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<'add' | 'import' | null>(null);

  const fetchMocks = async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/mocks`);
      if (!res.ok) throw new Error('Failed to fetch mocks');
      const data = await res.json();
      setMocks(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMocks();
  }, []);

  const handleFormSuccess = () => {
    setShowModal(null);
    fetchMocks();
  };

  const summaryStats = useMemo(() => {
    if (mocks.length === 0) return { total: 0, avgScore: 0 };
    const total = mocks.length;
    const avgScore = mocks.reduce((acc, mock) => acc + mock.score_overall, 0) / total;
    return { total, avgScore: avgScore.toFixed(2) };
  }, [mocks]);

  if (isLoading) {
    return <div className="text-center p-12">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center p-12 text-red-500">Error: {error}</div>;
  }

  // --- NEW USER VIEW ---
  if (mocks.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Welcome to SSC Analyzer!</h1>
        <p className="text-lg text-gray-400 mb-8">Get started by adding your first mock test.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Add Manually Card */}
          <div onClick={() => setShowModal('add')} className="bg-gray-800 p-8 rounded-lg shadow-lg hover:bg-gray-700/50 transition-all cursor-pointer">
            <h2 className="text-2xl font-semibold text-indigo-400 mb-2">Add Mock Manually</h2>
            <p className="text-gray-400">Enter your mock scores and sectional data directly using our form.</p>
          </div>
          {/* Import Card */}
          <div onClick={() => setShowModal('import')} className="bg-gray-800 p-8 rounded-lg shadow-lg hover:bg-gray-700/50 transition-all cursor-pointer">
            <h2 className="text-2xl font-semibold text-green-400 mb-2">Import from Testbook</h2>
            <p className="text-gray-400">Automatically import your performance data by providing a Testbook URL.</p>
          </div>
        </div>
         {/* Modal for Forms */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl relative">
              <button onClick={() => setShowModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button>
              {showModal === 'add' && <MockForm onSuccess={handleFormSuccess} />}
              {showModal === 'import' && <TestbookImportForm onSuccess={handleFormSuccess} />}
            </div>
          </div>
        )}
      </div>
    );
  }

  // --- EXISTING USER VIEW ---
  return (
    <div className="container mx-auto p-4 md:p-8">
      {/* Header and Stats */}
      <div className="flex flex-wrap justify-between items-center mb-8 gap-4">
        <div>
            <h1 className="text-4xl font-bold text-white">Your Dashboard</h1>
             <div className="flex items-center space-x-6 mt-2 text-gray-400">
                <p>Total Mocks: <span className="font-bold text-white">{summaryStats.total}</span></p>
                <p>Average Score: <span className="font-bold text-white">{summaryStats.avgScore}</span></p>
            </div>
        </div>
        <div className="flex space-x-4">
          <button onClick={() => setShowModal('add')} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            <PlusIcon /> Add Mock
          </button>
          <button onClick={() => setShowModal('import')} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            <GlobeIcon /> Import
          </button>
        </div>
      </div>

      {/* Mock List */}
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold text-white mb-4">Recent Mocks</h2>
        <div className="space-y-4">
          {mocks.map((mock) => (
            <div key={mock.id} className="grid grid-cols-5 items-center gap-4 bg-gray-700/50 p-4 rounded-lg hover:bg-gray-700/80 transition-all">
              <div className="col-span-2">
                <p className="font-bold text-white truncate">{mock.name}</p>
                <p className="text-sm text-gray-400">{new Date(mock.date_taken).toLocaleDateString()}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400">Score</p>
                <p className="font-semibold text-green-400">{mock.score_overall}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-400">Percentile</p>
                <p className="font-semibold text-blue-400">{mock.percentile_overall}%</p>
              </div>
              <div className="text-right">
                <Link href={`/mock/${mock.id}`} className="bg-gray-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors">
                  View Details
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for Forms */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl relative">
            <button onClick={() => setShowModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
            {showModal === 'add' && <MockForm onSuccess={handleFormSuccess} />}
            {showModal === 'import' && <TestbookImportForm onSuccess={handleFormSuccess} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

