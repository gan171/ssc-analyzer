'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import ScreenshotUploader from '../../../components/ScreenshotUploader';
import MistakeFocusView from '@/components/MistakeFocusView';
import Image from 'next/image';

// ... (interface definitions remain the same)
interface Section {
  id: number;
  name: string;
  score: number;
  correct_count: number;
  incorrect_count: number;
  unattempted_count: number;
  time_taken_seconds: number;
}

interface Mock {
  id: number;
  name: string;
  score_overall: number;
  percentile_overall: number;
  date_taken: string;
  sections: Section[];
}

interface Mistake {
  id: number;
  image_path: string;
  analysis_text: string | null;
  topic: string | null;
  section_name: string;
  question_type: string;
  notes: string; // Added notes field
}


const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const MockDetailPage = () => {
  const params = useParams();
  const id = params.id;

  const [mock, setMock] = useState<Mock | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedQuestionType, setSelectedQuestionType] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedMistake, setSelectedMistake] = useState<Mistake | null>(null);
  const [selectedMistakeIndex, setSelectedMistakeIndex] = useState(0);


  const fetchMistakes = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/mocks/${id}/mistakes`);
      if (!res.ok) throw new Error('Failed to fetch mistakes');
      const data = await res.json();
      setMistakes(data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  useEffect(() => {
    const fetchMock = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/mocks/${id}`);
        if (!res.ok) throw new Error('Failed to fetch mock details');
        const data = await res.json();
        setMock(data);
        await fetchMistakes();
      } catch (err: unknown) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMock();
  }, [id, fetchMistakes]);

  const handleUploadComplete = () => {
    setShowUploader(false);
    fetchMistakes();
  };

  const handleAnalyzeClick = async (mistakeId: number, analysisType: 'visual' | 'text') => {
    try {
      const res = await fetch(`${API_BASE_URL}/mistakes/${mistakeId}/analyze-text`, { 
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Analysis failed');
      }
      fetchMistakes();
    } catch (err: unknown) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteMistake = async (mistakeId: number) => {
    if (window.confirm('Are you sure you want to delete this mistake?')) {
      try {
        const res = await fetch(`${API_BASE_URL}/mistakes/${mistakeId}`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error('Failed to delete mistake');
        fetchMistakes();
      } catch (err: unknown) {
        alert(`Error: ${err.message}`);
      }
    }
  };
  
  const handleBulkAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/mocks/${id}/analyze-all-mistakes`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Bulk analysis failed');
      }
      alert('Bulk analysis complete!');
      fetchMistakes();
    } catch (err:unknown) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const openFocusView = (mistake: Mistake, index: number) => {
    setSelectedMistake(mistake);
    setSelectedMistakeIndex(index);
  }

  const closeFocusView = () => {
    setSelectedMistake(null);
  }

  const navigateMistake = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? selectedMistakeIndex + 1 : selectedMistakeIndex - 1;
    if (newIndex >= 0 && newIndex < mistakes.length) {
      setSelectedMistake(mistakes[newIndex]);
      setSelectedMistakeIndex(newIndex);
    }
  }

  const handleNotesUpdate = async (mistakeId: number, newNotes: string) => {
    try {
        const res = await fetch(`${API_BASE_URL}/mistakes/${mistakeId}/notes`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notes: newNotes }),
        });
        if (!res.ok) throw new Error('Failed to update notes');
        // Optimistically update local state
        const updatedMistakes = mistakes.map(m =>
            m.id === mistakeId ? { ...m, notes: newNotes } : m
        );
        setMistakes(updatedMistakes);
    } catch (err: unknown) {
        alert(`Error: ${err.message}`);
    }
};

  if (isLoading) return <div className="text-center mt-8">Loading...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">Error: {error}</div>;
  if (!mock) return <div className="text-center mt-8">Mock not found.</div>;

  const hasUnanalyzedMistakes = mistakes.some(m => !m.analysis_text);

  return (
    <div className="container mx-auto p-4 md:p-8">
        {selectedMistake && (
    <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex items-center justify-center p-4">
        <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-xl w-full max-w-6xl h-full max-h-[90vh] relative">
            <MistakeFocusView
                mistake={selectedMistake}
                // Pass a function to close the modal
                onDelete={handleDeleteMistake}
                onAnalysisComplete={() => {
                    // Refreshes data in both the modal and the background list
                    fetchMistakes();
                    // Find the updated mistake from the list to update the view
                    const updatedMistake = mistakes.find(m => m.id === selectedMistake.id);
                    if (updatedMistake) {
                        setSelectedMistake(updatedMistake);
                    }
                }}
            />
             <button 
                onClick={() => setSelectedMistake(null)} 
                className="absolute top-3 right-3 text-gray-400 hover:text-white bg-gray-900 rounded-full p-1"
                aria-label="Close"
             >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
        </div>
    </div>
)}
      {/* ... (Existing JSX for mock details and sections) ... */}
      
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 mb-8 text-white">
        <h1 className="text-4xl font-bold mb-2">{mock.name}</h1>
        <p className="text-gray-400 text-lg mb-4">Taken on: {new Date(mock.date_taken).toLocaleDateString()}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-xl text-gray-300">Overall Score</p>
            <p className="text-3xl font-semibold text-green-400">{mock.score_overall}</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-xl text-gray-300">Percentile</p>
            <p className="text-3xl font-semibold text-blue-400">{mock.percentile_overall}%</p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-4 text-gray-200">Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mock.sections.map((section) => (
            <div key={section.id} className="bg-gray-800 shadow-lg rounded-lg p-4 text-white">
              <h3 className="text-xl font-semibold text-indigo-400 mb-2">{section.name}</h3>
              <p>Score: <span className="font-medium text-green-400">{section.score}</span></p>
              <p>Correct: <span className="font-medium text-gray-300">{section.correct_count}</span></p>
              <p>Incorrect: <span className="font-medium text-gray-300">{section.incorrect_count}</span></p>
              <p>Unattempted: <span className="font-medium text-gray-300">{section.unattempted_count}</span></p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-3xl font-bold text-gray-200">Mistakes</h2>
          <div>
            {hasUnanalyzedMistakes && (
              <button
                onClick={handleBulkAnalyze}
                disabled={isAnalyzing}
                className="bg-purple-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed mr-4"
              >
                {isAnalyzing ? 'Analyzing...' : 'Analyze All Mistakes'}
              </button>
            )}
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700"
            >
              {showUploader ? 'Cancel' : 'Add Mistakes'}
            </button>
          </div>
        </div>

        {showUploader && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
               <div>
                 <label htmlFor="section" className="block text-sm font-medium text-gray-300 mb-1">Section</label>
                 <select
                   id="section"
                   value={selectedSection}
                   onChange={(e) => setSelectedSection(e.target.value)}
                   className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                 >
                   <option value="">Select a Section</option>
                   {mock.sections.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                 </select>
               </div>
               <div>
                 <label htmlFor="questionType" className="block text-sm font-medium text-gray-300 mb-1">Question Type</label>
                 <select
                   id="questionType"
                   value={selectedQuestionType}
                   onChange={(e) => setSelectedQuestionType(e.target.value)}
                   className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                 >
                   <option value="">Select Type</option>
                   <option value="Incorrect">Incorrect</option>
                   <option value="Unattempted">Unattempted</option>
                 </select>
               </div>
            </div>
            {/* --- FIX IS HERE --- We check for mock before rendering the uploader */}
            {selectedSection && selectedQuestionType && mock ? (
              <ScreenshotUploader
                mockId={mock.id}
                sectionName={selectedSection}
                questionType={selectedQuestionType}
                onUploadComplete={handleUploadComplete}
              />
            ) : <p className="text-gray-400">Please select a section and question type to begin uploading.</p>}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mistakes.map((mistake, index) => (
            <div 
              key={mistake.id} 
              className="bg-gray-800 rounded-lg shadow-md p-4 flex flex-col justify-between cursor-pointer hover:ring-2 hover:ring-indigo-500 transition-all"
              onClick={() => setSelectedMistake(mistake)}
            >
              <img src={`${process.env.NEXT_PUBLIC_API_URL}/api/uploads/${mistake.image_path}`} alt={`Mistake ${mistake.id}`} className="w-full h-48 object-cover"/>
              <div className="p-4">
                <p className="text-sm text-gray-400 mb-2">Section: {mistake.section_name} ({mistake.question_type})</p>
                {mistake.analysis_text ? (
                  <div>
                    <h4 className="font-bold text-indigo-400">{mistake.topic || 'Analysis'}</h4>
                    <p className="text-gray-300 whitespace-pre-wrap">{mistake.analysis_text}</p>
                  </div>
                ) : (
                  <div className="flex space-x-2 mt-2">
                    <button onClick={(e) => { e.stopPropagation(); handleAnalyzeClick(mistake.id, 'visual')}} className="text-sm bg-green-600 text-white font-semibold py-1 px-3 rounded hover:bg-green-700">Analyze (Visual)</button>
                    <button onClick={(e) => {e.stopPropagation(); handleAnalyzeClick(mistake.id, 'text')}} className="text-sm bg-yellow-600 text-white font-semibold py-1 px-3 rounded hover:bg-yellow-700">Analyze (Text)</button>
                  </div>
                )}
                 <button onClick={(e) => { e.stopPropagation(); handleDeleteMistake(mistake.id)}} className="text-xs text-red-400 hover:text-red-500 mt-4">Delete</button>
              </div>
            </div>
          ))}
        </div>
        {mistakes.length === 0 && <p className="text-gray-400">No mistakes have been added for this mock yet.</p>}
      </div>
    </div>
  );
};

export default MockDetailPage;