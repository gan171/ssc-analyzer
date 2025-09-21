'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ScreenshotUploader from '@/components/ScreenshotUploader';
import ReactMarkdown from 'react-markdown';

// --- TYPE DEFINITIONS ---
// Defines the structure for a single section's data
type Section = {
  id: number;
  name: string;
  score: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  time_taken_seconds: number;
};

// Defines the structure for the main mock object, including its sections
type MockDetails = {
  id: number;
  name: string;
  score_overall: number;
  percentile_overall: number;
  date_taken: string;
  sections: Section[];
};

// Defines the structure for a single mistake, now including the topic
type Mistake = {
  id: number;
  image_path: string;
  analysis_text: string | null;
  topic: string | null; // Added the topic field
  section_name: string;
  question_type: string;
};

// --- COMPONENT ---
export default function MockDetailPage() {
  const params = useParams();
  const id = params.id as string;

  // --- STATE MANAGEMENT ---
  const [mock, setMock] = useState<MockDetails | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzingId, setAnalyzingId] = useState<number | null>(null);

  // Read the API URL from the environment file
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // --- DATA FETCHING FUNCTIONS ---
  const fetchMistakes = async () => {
    if (!id) return;
    try {
      const response = await fetch(`${API_URL}/api/mocks/${id}/mistakes`);
      if (!response.ok) throw new Error('Failed to fetch mistakes');
      const data = await response.json();
      setMistakes(data);
    } catch (error) {
      console.error("Error fetching mistakes:", error);
    }
  };

  // --- EFFECT HOOK to load all initial data ---
  useEffect(() => {
    if (id && API_URL) {
      const fetchInitialData = async () => {
        setLoading(true);
        try {
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
  }, [id, API_URL]);

  // --- HANDLER FUNCTIONS ---
  const handleDelete = async (mistakeId: number) => {
    if (!window.confirm("Are you sure you want to delete this mistake?")) {
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/mistakes/${mistakeId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete mistake');
      setMistakes(currentMistakes => currentMistakes.filter(m => m.id !== mistakeId));
      alert('Mistake deleted successfully!');
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete the mistake.");
    }
  };

  const handleAnalyze = async (mistakeId: number, analysisType: 'visual' | 'text') => {
    setAnalyzingId(mistakeId);
    try {
      const response = await fetch(`${API_URL}/api/mistakes/${mistakeId}/analyze-${analysisType}`, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }
      // After a successful analysis, re-fetch the mistakes list to get the new analysis and topic
      await fetchMistakes();
    } catch (error: any) {
      console.error(`Analysis error (${analysisType}):`, error);
      alert(`Failed to get analysis: ${error.message}`);
    } finally {
      setAnalyzingId(null);
    }
  };

  // --- RENDER LOGIC ---
  if (loading) return <div className="text-center p-24">Loading...</div>;
  if (!mock) return <div className="text-center p-24">Mock not found.</div>;

  return (
    <main className="flex min-h-screen flex-col items-center p-6 md:p-12 bg-gray-900 text-white">
      <div className="w-full max-w-6xl">
        <Link href="/" className="text-blue-400 hover:underline mb-8 block">&larr; Back to All Mocks</Link>
        
        {/* Mock Header */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-8">
          <h1 className="text-3xl font-bold">{mock.name}</h1>
          <p className="text-gray-300 mt-2">Score: {mock.score_overall}</p>
          <p className="text-gray-300">Percentile: {mock.percentile_overall}%</p>
        </div>

        {/* Sectional Breakdown Table */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-md mb-12">
            <h2 className="text-2xl font-bold mb-4">Sectional Breakdown</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-gray-600">
                            <th className="p-2">Section</th>
                            <th className="p-2">Score</th>
                            <th className="p-2">Correct</th>
                            <th className="p-2">Incorrect</th>
                            <th className="p-2">Unattempted</th>
                            <th className="p-2">Time</th>
                        </tr>
                    </thead>
                    <tbody>
                        {mock.sections.map((section) => (
                            <tr key={section.id} className="border-b border-gray-700 last:border-b-0">
                                <td className="p-2 font-semibold">{section.name}</td>
                                <td className="p-2">{section.score}</td>
                                <td className="p-2 text-green-400">{section.correct_count}</td>
                                <td className="p-2 text-red-400">{section.incorrect_count}</td>
                                <td className="p-2 text-gray-400">{section.unattempted_count}</td>
                                <td className="p-2">{Math.floor(section.time_taken_seconds / 60)}m {section.time_taken_seconds % 60}s</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Upload & Mistakes Section */}
        <div className="space-y-8">
            {mock.sections.map(section => (
                <div key={section.id} className="bg-gray-800 p-6 rounded-lg">
                    <h2 className="text-2xl font-bold mb-4">{section.name}</h2>
                    <div className="grid md:grid-cols-2 gap-8">
                        {/* Incorrect */}
                        <div>
                            <h3 className="text-xl font-semibold mb-3">Incorrect Questions</h3>
                            <ScreenshotUploader 
                                mockId={id} 
                                onUploadSuccess={fetchMistakes} 
                                sectionName={section.name} 
                                questionType="Incorrect"
                            />
                            <div className="space-y-4 mt-4">
                                {mistakes.filter(m => m.section_name === section.name && m.question_type === 'Incorrect').map(mistake => (
                                    <div key={mistake.id} className="bg-gray-700 p-3 rounded-lg">
                                      <img src={`${API_URL}/uploads/${mistake.image_path.split(/[\\/]/).pop()}`} alt="Mistake" className="rounded w-full"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                        {/* Unattempted */}
                        <div>
                            <h3 className="text-xl font-semibold mb-3">Unattempted Questions</h3>
                            <ScreenshotUploader 
                                mockId={id} 
                                onUploadSuccess={fetchMistakes} 
                                sectionName={section.name} 
                                questionType="Unattempted"
                            />
                            <div className="space-y-4 mt-4">
                                {mistakes.filter(m => m.section_name === section.name && m.question_type === 'Unattempted').map(mistake => (
                                    <div key={mistake.id} className="bg-gray-700 p-3 rounded-lg">
                                       <img src={`${API_URL}/uploads/${mistake.image_path.split(/[\\/]/).pop()}`} alt="Mistake" className="rounded w-full"/>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
      </div>
    </main>
  );
}