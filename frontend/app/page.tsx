'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import MockForm from '@/components/MockForm';
import TestbookImportForm from '@/components/TestbookImportForm'; // Import the new component

// Define a type for our mock object
type Mock = {
  id: number;
  name: string;
  score_overall: number;
  percentile_overall: number;
  date_taken: string;
};

export default function HomePage() {
  // State to store the list of mocks
  const [mocks, setMocks] = useState<Mock[]>([]);
  const [loading, setLoading] = useState(true); // Start in loading state

  // Function to fetch mocks from the API
  const fetchMocks = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mocks`);
      if (!response.ok) {
        throw new Error('Failed to fetch mocks');
      }
      const data: Mock[] = await response.json();
      setMocks(data);
    } catch (error) {
      console.error(error);
    } finally {
        setLoading(false); // Stop loading, even if there's an error
    }
  };

  const handleDeleteMock = async (mockId: number, event: React.MouseEvent) => {
    event.preventDefault(); // Stop the Link from navigating
    event.stopPropagation(); // Stop the event from bubbling up

    if (!window.confirm("Are you sure you want to delete this entire mock and all its mistakes?")) {
      return;
    }

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mocks/${mockId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete mock');

      // Refresh the list of mocks
      fetchMocks();
      alert('Mock deleted successfully!');
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the mock.");
    }
  };

  // useEffect hook to fetch mocks when the component first loads
  useEffect(() => {
    fetchMocks();
  }, []); // The empty array [] ensures this runs only once

  if (loading) {
    return <div className="text-center p-24 text-xl">Loading...</div>;
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24">
      <div className="w-full max-w-5xl">
        <h1 className="text-4xl font-bold text-center mb-4">SSC Mock Analyzer</h1>
        <div className="text-center mb-8">
            <Link href="/dashboard" className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded">
                View Analytics Dashboard
            </Link>
        </div>

        <TestbookImportForm onMockImported={fetchMocks} />
        <MockForm onMockAdded={fetchMocks} />

        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Submitted Mocks</h2>
          <div className="space-y-4">
            {mocks.length === 0 ? (
                <p className="text-gray-400">No mocks submitted yet. Add one above to get started!</p>
            ) : (
                mocks.map((mock) => (
                  <Link href={`/mock/${mock.id}`} key={mock.id}>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-md hover:bg-gray-700 transition-colors cursor-pointer">
                      <div className="flex justify-between items-start">
                        {/* Mock Details */}
                        <div>
                          <h3 className="text-xl font-bold">{mock.name}</h3>
                          <p className="text-gray-300">Score: {mock.score_overall}</p>
                          <p className="text-gray-300">Percentile: {mock.percentile_overall}%</p>
                        </div>
                        {/* Delete Button */}
                        <button
                          onClick={(e) => handleDeleteMock(mock.id, e)}
                          className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold p-2 rounded flex-shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Taken on: {new Date(mock.date_taken).toLocaleString()}</p>
                    </div>
                  </Link>
                ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}