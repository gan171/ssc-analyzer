// frontend/app/dashboard/page.tsx

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
  is_analyzed: boolean; // Ensures the frontend knows the mock's status
  tier: string;
}

// --- SVG Icons for Buttons ---
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
  </svg>
);

const GlobeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.998 5.998 0 0116 10c0 .343-.011.683-.034 1.022a2.53 2.53 0 00-1.022-1.022A2.5 2.5 0 0012.5 8 1.5 1.5 0 0111 6.5V6a2 2 0 00-4 0v.5a1.5 1.5 0 01-1.5 1.5c-.526 0-.988-.27-1.256-.703a6.002 6.002 0 01-1.912-2.706zM10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" clipRule="evenodd" />
    </svg>
);

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

const DashboardPage = () => {
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState<'add' | 'import' | null>(null);
  const [editingMockId, setEditingMockId] = useState<number | null>(null);
  const [newMockName, setNewMockName] = useState<string>('');

  const fetchMocks = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/api/mocks`);
      if (!res.ok) throw new Error('Failed to fetch mocks');
      const data = await res.json();
      setMocks(data);
    } catch (err : unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMocks();
  }, []);

  const handleFormSuccess = () => {
    setShowModal(null);
    fetchMocks(); // Refetch mocks to update the list
  };
  
  const handleDeleteMock = async (mockId: number, event: React.MouseEvent) => {
    event.preventDefault(); 
    event.stopPropagation(); 

    if (!window.confirm("Are you sure you want to delete this mock?")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/mocks/${mockId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete mock');
      fetchMocks(); // Refresh the list
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the mock.");
    }
  };

  const summaryStats = useMemo(() => {
    if (mocks.length === 0) return { total: 0, avgScore: 0, avgPercentile: 0 };
    const analyzedMocks = mocks.filter(m => m.is_analyzed);
    if (analyzedMocks.length === 0) return { total: mocks.length, avgScore: 0, avgPercentile: 0 };
    const total = mocks.length;
    const avgScore = analyzedMocks.reduce((acc, mock) => acc + mock.score_overall, 0) / analyzedMocks.length;
    const avgPercentile = analyzedMocks.reduce((acc, mock) => acc + mock.percentile_overall, 0) / analyzedMocks.length;
    return { 
        total, 
        avgScore: avgScore.toFixed(2),
        avgPercentile: avgPercentile.toFixed(2)
    };
  }, [mocks]);

  // Separate mocks into analyzed and unanalyzed
  const analyzedMocks = mocks.filter(mock => mock.is_analyzed);
  const unanalyzedMocks = mocks.filter(mock => !mock.is_analyzed);

  if (isLoading) {
    return <div className="text-center p-12 text-xl">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center p-12 text-red-500">Error: {error}</div>;
  }

  const handleNameUpdate = async () => {
    if (!editingMockId) return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/mocks/${editingMockId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newMockName }),
      });

      if (!res.ok) {
        throw new Error('Failed to update mock name');
      }

      setEditingMockId(null); // Exit editing mode
      fetchMocks(); // Refresh the list of mocks with the new name
      
    } catch (err: unknown ) {
      console.error(err);
      // Optionally, show an error message to the user
    }
  };

  const handleBackfillTiers = async () => {
  if (!window.confirm("This will update tiers for all existing mocks. This is a one-time action. Continue?")) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/api/mocks/backfill-tiers`, {
      method: 'POST',
    });
    
    if (!res.ok) {
      throw new Error('Failed to backfill tiers');
    }
    
    const result = await res.json();
    alert(result.message); // Show a success message
    fetchMocks(); // Refresh the dashboard to show the new tiers
    
  } catch (err : unknown) {
    console.error(err);
    alert('An error occurred while updating tiers.');
  }
};

  // --- NEW USER VIEW ---
  if (mocks.length === 0) {
    return (
      <div className="container mx-auto p-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-4">Welcome to Your Dashboard!</h1>
        <p className="text-lg text-gray-400 mb-8">It looks empty in here. Add your first mock to get started.</p>
        <div className="flex justify-center space-x-4">
            <button onClick={() => setShowModal('add')} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg">
                <PlusIcon/> Add Manually
            </button>
            <button onClick={() => setShowModal('import')} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">
                <GlobeIcon/> Import from Testbook
            </button>
        </div>
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 overflow-y-auto p-4 pt-12 md:pt-20">
            <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl relative">
              <button onClick={() => setShowModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl font-bold">&times;</button>
              <div className="mt-4">
                {showModal === 'add' && <MockForm onMockAdded={handleFormSuccess} />}
                {showModal === 'import' && <TestbookImportForm onMockImported={handleFormSuccess} />}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Helper to render a list of mocks
  const renderMockList = (mockList: Mock[], title: string) => (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg mb-8">
      <h2 className="text-2xl font-semibold text-white mb-4">{title}</h2>
      {mockList.length > 0 ? (
        <div className="space-y-4">
          {mockList.map((mock) => {
          const mockContent = (
            <div className="grid grid-cols-12 items-center gap-4 bg-gray-700/50 p-4 rounded-lg group-hover:bg-gray-700/80 transition-all">
              <div className="col-span-6">
                {editingMockId === mock.id ? (
                  // --- STATE: EDITING (No Link) ---
                  <div className="flex items-center gap-2 w-full">
                    <input
                      type="text"
                      value={newMockName}
                      onChange={(e) => setNewMockName(e.target.value)}
                      className="bg-gray-900 text-white border border-gray-600 rounded px-2 py-1 w-full"
                      autoFocus
                    />
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleNameUpdate(); }} 
                      className="text-xs bg-green-600 hover:bg-green-700 text-white font-bold p-2 rounded flex-shrink-0"
                    >
                      Save
                    </button>
                    <button 
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingMockId(null); }} 
                      className="text-xs bg-gray-600 hover:bg-gray-700 text-white font-bold p-2 rounded flex-shrink-0"
                    >
                      X
                    </button>
                  </div>
                ) : (
                  // --- STATE: DEFAULT ---
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-white truncate">{mock.name}</p>
                    <button 
                      onClick={(e) => { 
                        e.preventDefault(); 
                        e.stopPropagation(); 
                        setEditingMockId(mock.id);
                        setNewMockName(mock.name);
                      }} 
                      className="text-xs p-1 rounded-full hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ✏️
                    </button>
                  </div>
                )}
                <p className="text-sm text-gray-400 mt-1">
                  {new Date(mock.date_taken).toLocaleDateString()}
                  {mock.tier && <span className="ml-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs">{mock.tier}</span>}
                </p>
              </div>
              <div className="col-span-2 text-center">
                <p className="text-sm text-gray-400">Score</p>
                <p className="font-semibold text-green-400">{mock.score_overall}</p>
              </div>
              <div className="col-span-2 text-center">
                <p className="text-sm text-gray-400">Percentile</p>
                <p className="font-semibold text-blue-400">{mock.percentile_overall}%</p>
              </div>
              <div className="col-span-2 text-right">
                <button
                  onClick={(e) => handleDeleteMock(mock.id, e)}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Delete
                </button>
              </div>
            </div>
          );

          return editingMockId === mock.id ? (
            <div key={mock.id} className="block group">
              {mockContent}
            </div>
          ) : (
            <Link href={`/mock/${mock.id}`} key={mock.id} className="block group">
              {mockContent}
            </Link>
          );
        })}
        </div>
      ) : (
        <p className="text-gray-400">No mocks found in this category.</p>
      )}
    </div>
  );

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
                 <p>Average Percentile: <span className="font-bold text-white">{summaryStats.avgPercentile}%</span></p>
            </div>
        </div>
        <div className="flex space-x-4">
          <button onClick={() => setShowModal('add')} className="flex items-center bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            <PlusIcon /> Add Mock
          </button>
          <button onClick={() => setShowModal('import')} className="flex items-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
            <GlobeIcon /> Import
          </button>
          {/* Add the new button here */}
          <button 
            onClick={handleBackfillTiers} 
            className="flex items-center bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            Update Old Tiers
          </button>
        </div>
      </div>

      {/* Mock Lists */}
      {renderMockList(unanalyzedMocks, "Unanalyzed Mocks")}
      {renderMockList(analyzedMocks, "Analyzed Mocks")}

      {/* Modal for Forms */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-start z-50 overflow-y-auto p-4 pt-12 md:pt-20">
          <div className="bg-gray-800 p-8 rounded-lg shadow-2xl w-full max-w-2xl relative">
            <button onClick={() => setShowModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-2xl">&times;</button>
             <div className="mt-4">
                {showModal === 'add' && <MockForm onMockAdded={handleFormSuccess} />}
                {showModal === 'import' && <TestbookImportForm onMockImported={handleFormSuccess} />}
              </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;