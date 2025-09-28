"use client";
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// --- Icon Components ---
const PencilSquareIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
    </svg>
);

const BookmarkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z" />
    </svg>
);

const LightBulbIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 0 0 1.5-.189m-1.5.189a6.01 6.01 0 0 1-1.5-.189m3.75 7.478a12.06 12.06 0 0 1-4.5 0m3.75 2.383a14.406 14.406 0 0 1-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 1 0-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
    </svg>
);

const ClockIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
);

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
);

const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
);

// --- Interface Definitions ---
interface Mistake {
  id: number;
  image_path: string;
  analysis_text: string | null;
  topic: string | null;
  notes: string | null;
  created_at?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  is_bookmarked?: boolean;
}

interface MistakeFocusViewProps {
  mistake: Mistake;
  onAnalysisComplete: () => void;
  onDelete: (mistakeId: number) => void;
}

// --- Helper Components ---
const Spinner = () => (
    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DifficultyBadge = ({ difficulty }: { difficulty?: string }) => {
  const colors = {
    easy: 'bg-green-500/20 text-green-300 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    hard: 'bg-red-500/20 text-red-300 border-red-500/30'
  };
  
  if (!difficulty) return null;
  
  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${colors[difficulty as keyof typeof colors] || colors.medium}`}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </span>
  );
};

// --- Main Component ---
export default function MistakeFocusView({ mistake, onAnalysisComplete, onDelete }: MistakeFocusViewProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [isEditingReflection, setIsEditingReflection] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(mistake.notes || '');
  const [currentReflection, setCurrentReflection] = useState('');
  const [isInverted, setIsInverted] = useState(false);
  const [imageAnnotations, setImageAnnotations] = useState<Array<{x: number, y: number, note: string}>>([]);
  const [isBookmarked, setIsBookmarked] = useState(mistake.is_bookmarked || false);
  const [studyTimer, setStudyTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [keyInsights, setKeyInsights] = useState<string[]>([]);
  const [nextSteps, setNextSteps] = useState<string[]>([]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setStudyTimer(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Sync state if the mistake prop changes
  useEffect(() => {
    setCurrentNotes(mistake.notes || '');
    setIsEditingNotes(false);
    setIsEditingReflection(false);
    setStudyTimer(0);
    setIsTimerRunning(false);
  }, [mistake]);
  
  // Memoize the status for performance and clarity
  const status = useMemo(() => {
    if (isAnalyzing) return { text: 'Analyzing...', color: 'bg-yellow-500' };
    if (mistake.analysis_text) return { text: 'Analyzed', color: 'bg-green-500' };
    return { text: 'Needs Analysis', color: 'bg-gray-500' };
  }, [isAnalyzing, mistake.analysis_text]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- API Handlers ---
  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    toast.info('Analyzing mistake...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mistakes/${mistake.id}/analyze-text`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to analyze mistake');
      
      // Parse analysis to extract insights and next steps
      const data = await response.json();
      if (data.analysis_text) {
        const insights = extractInsights(data.analysis_text);
        const steps = extractNextSteps(data.analysis_text);
        setKeyInsights(insights);
        setNextSteps(steps);
      }
      
      toast.success('Analysis complete!');
      onAnalysisComplete();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const extractInsights = (text: string): string[] => {
    // Simple extraction logic - could be improved with better NLP
    const insights: string[] = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.toLowerCase().includes('key insight') || line.toLowerCase().includes('important') || line.toLowerCase().includes('remember')) {
        insights.push(line.trim());
      }
    });
    return insights.slice(0, 3); // Limit to top 3 insights
  };

  const extractNextSteps = (text: string): string[] => {
    const steps: string[] = [];
    const lines = text.split('\n');
    lines.forEach(line => {
      if (line.toLowerCase().includes('practice') || line.toLowerCase().includes('review') || line.toLowerCase().includes('study')) {
        steps.push(line.trim());
      }
    });
    return steps.slice(0, 3); // Limit to top 3 steps
  };

  const handleBookmark = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mistakes/${mistake.id}/bookmark`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_bookmarked: !isBookmarked }),
      });
      if (response.ok) {
        setIsBookmarked(!isBookmarked);
        toast.success(isBookmarked ? 'Bookmark removed' : 'Bookmarked for review');
      }
    } catch (error) {
      toast.error('Failed to update bookmark');
    }
  };
  
  const handleDelete = () => {
      toast(
        ({ closeToast }) => (
          <div className="flex flex-col">
            <p className="font-semibold">Confirm Deletion</p>
            <p className="text-sm text-gray-300 mt-1">This action cannot be undone.</p>
            <div className="flex justify-end mt-3 space-x-2">
               <button onClick={closeToast} className="px-3 py-1 text-sm rounded bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
               <button onClick={async () => {
                  closeToast();
                  setIsDeleting(true);
                  toast.info('Deleting mistake...');
                  try {
                      await onDelete(mistake.id);
                      toast.success('Mistake deleted.');
                  } catch (error) {
                      toast.error('Failed to delete mistake.');
                  } finally {
                      setIsDeleting(false);
                  }
               }} className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-500 text-white transition-colors">Delete</button>
            </div>
          </div>
        ), { autoClose: false, closeButton: false }
      );
  };

  const handleSaveNotes = async () => {
    toast.info('Saving note...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mistakes/${mistake.id}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: currentNotes }),
      });
      if (!response.ok) throw new Error('Failed to save note');
      toast.success('Note saved successfully!');
      setIsEditingNotes(false);
      onAnalysisComplete(); 
    } catch (error) {
      console.error('Save notes error:', error);
      toast.error('Failed to save note.');
    }
  };

  const handleSaveReflection = async () => {
    toast.info('Saving reflection...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mistakes/${mistake.id}/reflection`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reflection: currentReflection }),
      });
      if (!response.ok) throw new Error('Failed to save reflection');
      toast.success('Reflection saved!');
      setIsEditingReflection(false);
    } catch (error) {
      toast.error('Failed to save reflection.');
    }
  };

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-full flex">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 w-full">
        
        {/* --- Left side (3/5 width): Screenshot Viewer --- */}
        <div className="lg:col-span-3 bg-gray-900/50 rounded-lg flex flex-col p-4">
          {/* Study Session Header */}
          <div className="flex justify-between items-center mb-4 px-2">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <ClockIcon />
                <span className="text-sm text-gray-300">Study Time: {formatTime(studyTimer)}</span>
                <button
                  onClick={() => setIsTimerRunning(!isTimerRunning)}
                  className={`px-3 py-1 text-xs rounded-md transition-colors ${isTimerRunning ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'} text-white`}
                >
                  {isTimerRunning ? 'Pause' : 'Start'}
                </button>
              </div>
              {mistake.topic && (
                <span className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-md">
                  {mistake.topic}
                </span>
              )}
              <DifficultyBadge difficulty={mistake.difficulty} />
            </div>
            <button
              onClick={handleBookmark}
              className={`p-2 rounded-md transition-colors ${isBookmarked ? 'bg-yellow-500/20 text-yellow-300' : 'bg-gray-700 text-gray-400 hover:text-yellow-300'}`}
            >
              <BookmarkIcon />
            </button>
          </div>

          <TransformWrapper>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="w-full aspect-video rounded-lg overflow-hidden border border-gray-700 flex items-center justify-center bg-black relative group">
                    <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                        <img
                            src={`${process.env.NEXT_PUBLIC_API_URL}/api/uploads/${mistake.image_path}`}
                            alt="Mistake screenshot"
                            className={`max-w-full max-h-full object-contain cursor-grab ${isInverted ? 'filter invert' : ''}`}
                        />
                    </TransformComponent>
                    {/* Enhanced Floating Controls */}
                    <div className="absolute bottom-3 right-3 flex items-center space-x-1 bg-gray-900/80 p-2 rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <button title="Zoom In" onClick={() => zoomIn()} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 text-white text-sm">+</button>
                      <button title="Zoom Out" onClick={() => zoomOut()} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 text-white text-sm">-</button>
                      <button title="Reset" onClick={() => resetTransform()} className="p-1.5 bg-gray-700 rounded-md hover:bg-gray-600 text-white text-xs">Reset</button>
                      <button 
                        title={isInverted ? 'Normal Colors' : 'Invert Colors'} 
                        onClick={() => setIsInverted(!isInverted)} 
                        className={`p-2 rounded-md transition-colors text-white ${isInverted ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'}`}
                      >
                        <EyeIcon />
                      </button>
                    </div>
                </div>
              </>
            )}
          </TransformWrapper>

          {/* Quick Actions Bar */}
          <div className="mt-4 flex justify-center space-x-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isAnalyzing ? <Spinner /> : <SparklesIcon />}
              <span>{mistake.analysis_text ? 'Re-Analyze' : 'Analyze'}</span>
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-md text-white bg-red-600/80 hover:bg-red-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isDeleting ? <Spinner /> : <TrashIcon />}
              <span>Delete</span>
            </button>
          </div>
        </div>

        {/* --- Right side (2/5 width): Enhanced Learning Panel --- */}
        <div className="lg:col-span-2 bg-gray-900 rounded-lg p-4 flex flex-col overflow-hidden">
          {/* Header with Status */}
          <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-lg font-bold text-white">Learning Center</h2>
              <span className={`px-3 py-1 text-xs font-semibold text-white rounded-full ${status.color}`}>
                  {status.text}
              </span>
          </div>

          {/* Scrollable Learning Content */}
          <div className="flex-grow overflow-y-auto space-y-4 pr-2">
              
              {/* Key Insights Card */}
              {keyInsights.length > 0 && (
                <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-3">
                    <LightBulbIcon />
                    <h3 className="text-sm font-semibold text-blue-300">Key Insights</h3>
                  </div>
                  <div className="space-y-2">
                    {keyInsights.map((insight, index) => (
                      <div key={index} className="text-xs text-gray-200 bg-gray-800/50 p-2 rounded">
                        • {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Analysis Card */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                    <SparklesIcon />
                    <span>AI Analysis</span>
                  </h3>
                  <div className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">
                      {isAnalyzing && <p className="text-gray-400 italic">Generating detailed analysis...</p>}
                      {!isAnalyzing && mistake.analysis_text && (
                        <div className="max-h-40 overflow-y-auto">
                          {mistake.analysis_text}
                        </div>
                      )}
                      {!isAnalyzing && !mistake.analysis_text && (
                        <p className="text-gray-500 italic">Click "Analyze" to generate an AI-powered explanation of your mistake and get personalized learning recommendations.</p>
                      )}
                  </div>
              </div>

              {/* Your Learning Notes */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-white">Learning Notes</h3>
                    {!isEditingNotes && (
                      <button onClick={() => setIsEditingNotes(true)} className="text-gray-400 hover:text-white transition-colors p-1">
                          <PencilSquareIcon />
                      </button>
                    )}
                  </div>
                  {isEditingNotes ? (
                      <div className="space-y-3">
                        <textarea
                          value={currentNotes}
                          onChange={(e) => setCurrentNotes(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          rows={4}
                          placeholder="What did you learn? What concepts need more review? Any patterns you notice?"
                        />
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => setIsEditingNotes(false)} className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
                          <button onClick={handleSaveNotes} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors">Save Notes</button>
                        </div>
                      </div>
                  ) : (
                    <div className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">
                      {mistake.notes || <span className="text-gray-500 italic">Add your learning notes here. Reflect on what went wrong and how to avoid it next time.</span>}
                    </div>
                  )}
              </div>

              {/* Self-Reflection Section */}
              <div className="bg-gray-800/50 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-sm font-semibold text-white">Self-Reflection</h3>
                    {!isEditingReflection && (
                      <button onClick={() => setIsEditingReflection(true)} className="text-gray-400 hover:text-white transition-colors p-1">
                          <PencilSquareIcon />
                      </button>
                    )}
                  </div>
                  {isEditingReflection ? (
                      <div className="space-y-3">
                        <textarea
                          value={currentReflection}
                          onChange={(e) => setCurrentReflection(e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                          rows={4}
                          placeholder="How are you feeling about this mistake? What strategies will you use to improve? How does this connect to your overall learning goals?"
                        />
                        <div className="flex justify-end space-x-2">
                          <button onClick={() => setIsEditingReflection(false)} className="px-3 py-1.5 text-xs font-medium rounded-md text-gray-300 bg-gray-600 hover:bg-gray-500 transition-colors">Cancel</button>
                          <button onClick={handleSaveReflection} className="px-3 py-1.5 text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 transition-colors">Save Reflection</button>
                        </div>
                      </div>
                  ) : (
                    <div className="text-gray-300 text-xs whitespace-pre-wrap leading-relaxed">
                      {currentReflection || <span className="text-gray-500 italic">Reflect on your learning process, emotions, and strategies for improvement.</span>}
                    </div>
                  )}
              </div>

              {/* Next Steps Card */}
              {nextSteps.length > 0 && (
                <div className="bg-gradient-to-br from-green-500/10 to-teal-500/10 border border-green-500/20 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-green-300 mb-3">Recommended Next Steps</h3>
                  <div className="space-y-2">
                    {nextSteps.map((step, index) => (
                      <div key={index} className="text-xs text-gray-200 bg-gray-800/50 p-2 rounded flex items-start space-x-2">
                        <span className="text-green-400 font-bold">{index + 1}.</span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Stats */}
              <div className="bg-gray-800/30 rounded-lg p-3 text-center">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-gray-400">Study Time</div>
                    <div className="text-white font-semibold">{formatTime(studyTimer)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Status</div>
                    <div className="text-white font-semibold">{mistake.analysis_text ? 'Complete' : 'In Progress'}</div>
                  </div>
                </div>
              </div>

          </div>
        </div>
      </div>
    </div>
  );
}