'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ScreenshotUploader from '@/components/ScreenshotUploader'; 
import ReactMarkdown from 'react-markdown';

type MockDetails = {
  id: number;
  name: string;
  score_overall: number;
  percentile_overall: number;
};

type Mistake = {
  id: number;
  image_path: string;
  analysis_text: string | null;
};

export default function MockDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [mock, setMock] = useState<MockDetails | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  // Read the variable from the .env.local file
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  const fetchMistakes = async () => {
    if (!id) return;
    try {
      // Use the API_URL variable
      const response = await fetch(`${API_URL}/api/mocks/${id}/mistakes`);
      if (!response.ok) throw new Error('Failed to fetch mistakes');
      const data = await response.json();
      setMistakes(data);
    } catch (error) {
      console.error("Error fetching mistakes:", error);
    }
  };

  useEffect(() => {
    if (id) {
      const fetchInitialData = async () => {
        setLoading(true);
        try {
          // Use the API_URL variable
          const mockDetailsResponse = await fetch(`${API_URL}/api/mocks/${id}`);
          if (!mockDetailsResponse.ok) throw new Error('Failed to fetch mock details');
          const mockData = await mockDetailsResponse.json();
          setMock(mockData);
          await fetchMistakes();
        } catch (error) {
          console.error(error);
        } finally {
          setLoading(false);
        }
      };
      fetchInitialData();
    }
  }, [id]);
  // Add this function inside your MockDetailPage component
const handleDelete = async (mistakeId: number) => {
  // Ask for confirmation before deleting
  if (!window.confirm("Are you sure you want to delete this mistake?")) {
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/mistakes/${mistakeId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete mistake');
    }

    // Update the UI by removing the deleted mistake from the state
    setMistakes(currentMistakes => 
      currentMistakes.filter(m => m.id !== mistakeId)
    );
    alert('Mistake deleted successfully!');
  } catch (error) {
    console.error("Delete error:", error);
    alert("Failed to delete the mistake.");
  }
};

  const handleAnalyze = async (mistakeId: number, analysisType: 'visual' | 'text') => {
    setAnalyzingId(mistakeId);
    try {
      // Use the API_URL variable
      const response = await fetch(`${API_URL}/api/mistakes/${mistakeId}/analyze-${analysisType}`, {
        method: 'POST',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      const result = await response.json();
      setMistakes(currentMistakes => 
        currentMistakes.map(m => 
          m.id === mistakeId ? { ...m, analysis_text: result.analysis } : m
        )
      );
    } catch (error: any) {
      console.error(`Analysis error (${analysisType}):`, error);
      alert(`Failed to get analysis: ${error.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  if (loading) return <div className="text-center p-24">Loading...</div>;
  if (!mock) return <div className="text-center p-24">Mock not found.</div>;

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md-p-24">
      <div className="w-full max-w-5xl">
        <Link href="/" className="text-blue-400 hover:underline mb-8 block">&larr; Back to All Mocks</Link>
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-12">
          <h1 className="text-3xl font-bold">{mock.name}</h1>
          <p className="text-gray-300 mt-2">Score: {mock.score_overall}</p>
          <p className="text-gray-300">Percentile: {mock.percentile_overall}%</p>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Upload New Mistakes</h2>
          <ScreenshotUploader mockId={id} onUploadSuccess={fetchMistakes} />
        </div>

        <div>
          <h2 className="text-2xl font-semibold mb-4">Uploaded Screenshots</h2>
          <div className="space-y-6">
            {mistakes.length === 0 && <p className="text-gray-400">No mistakes uploaded yet.</p>}
            {mistakes.map((mistake) => {
  const filename = mistake.image_path.split(/[\\/]/).pop();
  const imageUrl = `${API_URL}/uploads/${filename}`;
  console.log("Attempting to load image from:", imageUrl);

  return (
    <div key={mistake.id} className="bg-gray-800 p-4 rounded-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Image Column */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <p className="text-sm font-semibold truncate">{filename}</p>
            {/* New Delete Button */}
            <button 
              onClick={() => handleDelete(mistake.id)}
              className="text-xs bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-2 rounded"
            >
              Delete
            </button>
          </div>
          <img 
            src={imageUrl} 
            alt={`Mistake screenshot ${mistake.id}`}
            className="rounded-lg w-full" 
          />
        </div>

        {/* Analysis Column */}
        <div>
          {mistake.analysis_text ? (
            <div className="prose prose-invert text-sm">
              <ReactMarkdown>{mistake.analysis_text}</ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <button onClick={() => handleAnalyze(mistake.id, 'visual')} disabled={analyzingId === mistake.id} className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm py-1 px-3 rounded disabled:bg-gray-500">
                {analyzingId === mistake.id ? 'Analyzing...' : 'Analyze as Visual'}
              </button>
              <button onClick={() => handleAnalyze(mistake.id, 'text')} disabled={analyzingId === mistake.id} className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm py-1 px-3 rounded disabled:bg-gray-500">
                {analyzingId === mistake.id ? 'Analyzing...' : 'Analyze as Text'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
})}
          </div>
        </div>
      </div>
    </main>
  );
}