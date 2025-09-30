'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import ScreenshotUploader from '../../../components/ScreenshotUploader';
import MistakeFocusView from '@/components/MistakeFocusView';
import Image from 'next/image';

// Interface definitions
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
  notes: string;
}

interface LoadingStates {
  mock: boolean;
  mistakes: boolean;
  analyzing: boolean;
  deleting: Set<number>;
  updating: Set<number>;
}

interface Errors {
  mock: string | null;
  mistakes: string | null;
  upload: string | null;
  analysis: string | null;
}

interface Filters {
  section: string;
  questionType: string;
  analyzed: 'all' | 'analyzed' | 'unanalyzed';
  topic: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Custom hooks
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// Component definitions
const MistakeCardSkeleton = () => (
  <div className="bg-gray-800 rounded-lg shadow-md p-4 animate-pulse">
    <div className="w-full h-48 bg-gray-700 rounded mb-4"></div>
    <div className="space-y-2">
      <div className="h-4 bg-gray-700 rounded"></div>
      <div className="h-4 bg-gray-700 rounded w-3/4"></div>
      <div className="h-3 bg-gray-700 rounded w-1/2"></div>
    </div>
  </div>
);

const ProgressiveImage = ({ src, alt, className, onClick }: {
  src: string;
  alt: string;
  className: string;
  onClick?: () => void;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {!loaded && !error && (
        <div className="absolute inset-0 bg-gray-700 animate-pulse rounded flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      )}
      {error ? (
        <div className="absolute inset-0 bg-gray-700 flex items-center justify-center text-gray-400 rounded">
          <div className="text-center">
            <div className="text-2xl mb-2">📷</div>
            <div className="text-xs">Failed to load</div>
          </div>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={`${className} transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  );
};

const StatsCard = ({ title, value, subtitle, color, icon }: {
  title: string;
  value: string | number;
  subtitle?: string;
  color: string;
  icon?: React.ReactNode;
}) => (
  <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 hover:border-gray-600 transition-all">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-400 text-sm font-medium">{title}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
      </div>
      {icon && <div className={`${color} opacity-20 text-3xl`}>{icon}</div>}
    </div>
  </div>
);

const ToastContainer = ({ toasts, removeToast }: {
  toasts: Toast[];
  removeToast: (id: number) => void;
}) => (
  <div className="fixed top-4 right-4 z-60 space-y-2">
    {toasts.map(toast => (
      <div
        key={toast.id}
        className={`px-4 py-3 rounded-lg shadow-lg transform transition-all duration-300 flex items-center justify-between min-w-80 ${
          toast.type === 'error' ? 'bg-red-600' :
          toast.type === 'success' ? 'bg-green-600' :
          toast.type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600'
        } text-white`}
      >
        <span className="text-sm">{toast.message}</span>
        <button 
          onClick={() => removeToast(toast.id)}
          className="ml-3 text-white hover:text-gray-200"
        >
          ×
        </button>
      </div>
    ))}
  </div>
);

const FocusViewModal = ({ 
  mistake, 
  mistakes, 
  selectedMistakeIndex, 
  onClose, 
  onNavigate, 
  onDelete, 
  onAnalysisComplete 
}: {
  mistake: Mistake;
  mistakes: Mistake[];
  selectedMistakeIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
  onDelete: (id: number) => Promise<void>;
  onAnalysisComplete: () => void;
}) => {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-7xl h-full max-h-[95vh] relative transform transition-all duration-200">
        
        {/* Navigation indicators */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex space-x-1 z-10">
          {mistakes.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                i === selectedMistakeIndex ? 'bg-indigo-500' : 'bg-gray-600 hover:bg-gray-500'
              }`}
              onClick={() => {
                const targetMistake = mistakes[i];
                if (targetMistake) {
                  onNavigate(i > selectedMistakeIndex ? 'next' : 'prev');
                }
              }}
            />
          ))}
        </div>

        {/* Navigation arrows */}
        {selectedMistakeIndex > 0 && (
          <button
            onClick={() => onNavigate('prev')}
            className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-gray-900/80 backdrop-blur-sm text-white p-3 rounded-full hover:bg-gray-800 transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        
        {selectedMistakeIndex < mistakes.length - 1 && (
          <button
            onClick={() => onNavigate('next')}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-gray-900/80 backdrop-blur-sm text-white p-3 rounded-full hover:bg-gray-800 transition-all z-10"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        
        {/* Content */}
        <MistakeFocusView 
          mistake={mistake} 
          onDelete={onDelete}
          onAnalysisComplete={onAnalysisComplete}
        />
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-900/80 backdrop-blur-sm rounded-full p-2 transition-all hover:bg-gray-800 z-10"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// Main component
const MockDetailPage = () => {
  const params = useParams();
  const id = params.id;

  // State management
  const [mock, setMock] = useState<Mock | null>(null);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [selectedMistakes, setSelectedMistakes] = useState<Set<number>>(new Set());
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    mock: true,
    mistakes: false,
    analyzing: false,
    deleting: new Set(),
    updating: new Set()
  });
  const [errors, setErrors] = useState<Errors>({
    mock: null,
    mistakes: null,
    upload: null,
    analysis: null
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  
  // UI state
  const [showUploader, setShowUploader] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedQuestionType, setSelectedQuestionType] = useState('');
  const [selectedMistake, setSelectedMistake] = useState<Mistake | null>(null);
  const [selectedMistakeIndex, setSelectedMistakeIndex] = useState(0);
  
  // Filter and search state
  const [filters, setFilters] = useState<Filters>({
    section: '',
    questionType: '',
    analyzed: 'all',
    topic: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  
  // Auto-save notes
  const [localNotes, setLocalNotes] = useState<Record<number, string>>({});
  const debouncedNotes = useDebounce(JSON.stringify(localNotes), 1000);

  // Grid responsiveness
  const [gridCols, setGridCols] = useState(3);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };
    setToasts(prev => [...prev, toast]);
    setTimeout(() => removeToast(id), duration);
  }, [removeToast]);

  // Retry mechanism
  const retryFetch = async (fetchFunction: () => Promise<void>, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await fetchFunction();
        return;
      } catch (err) {
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
      }
    }
  };

  // Fetch functions
  const fetchMistakes = useCallback(async () => {
    if (!id) return;
    setLoadingStates(prev => ({ ...prev, mistakes: true }));
    setErrors(prev => ({ ...prev, mistakes: null }));
    
    try {
      const res = await fetch(`${API_BASE_URL}/mocks/${id}/mistakes`);
      if (!res.ok) throw new Error('Failed to fetch mistakes');
      const data = await res.json();
      setMistakes(data);
      
      // Initialize local notes
      const notesMap: Record<number, string> = {};
      data.forEach((mistake: Mistake) => {
        notesMap[mistake.id] = mistake.notes || '';
      });
      setLocalNotes(notesMap);
    } catch (err: any) {
      setErrors(prev => ({ ...prev, mistakes: err.message }));
      addToast('Failed to fetch mistakes', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, mistakes: false }));
    }
    }, [id, addToast]);

  // Auto-save notes effect
  useEffect(() => {
    const notesToUpdate = JSON.parse(debouncedNotes);
    Object.entries(notesToUpdate).forEach(([mistakeId, notes]) => {
      const originalMistake = mistakes.find(m => m.id === parseInt(mistakeId));
      if (originalMistake && notes !== originalMistake.notes) {
        handleNotesUpdate(parseInt(mistakeId), notes as string);
      }
    });
  }, [debouncedNotes, mistakes]);

  // Grid responsiveness effect
  useEffect(() => {
    const updateGridCols = () => {
      const width = window.innerWidth;
      if (width < 768) setGridCols(1);
      else if (width < 1024) setGridCols(2);
      else if (width < 1536) setGridCols(3);
      else setGridCols(4);
    };
    
    updateGridCols();
    window.addEventListener('resize', updateGridCols);
    return () => window.removeEventListener('resize', updateGridCols);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedMistake) return;
      
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          navigateMistake('prev');
          break;
        case 'ArrowRight':
          e.preventDefault();
          navigateMistake('next');
          break;
        case 'Escape':
          e.preventDefault();
          setSelectedMistake(null);
          break;
        case 'Delete':
          if (e.shiftKey) {
            e.preventDefault();
            handleDeleteMistake(selectedMistake.id);
          }
          break;
      }
    };

    if (selectedMistake) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedMistake, selectedMistakeIndex]);

  // Initial data fetch
   useEffect(() => {
    const fetchMock = async () => {
      if (!id) return;
      setLoadingStates(prev => ({ ...prev, mock: true }));
      setErrors(prev => ({ ...prev, mock: null }));
      
      try {
        const res = await fetch(`${API_BASE_URL}/mocks/${id}`);
        if (!res.ok) throw new Error('Failed to fetch mock details');
        const data = await res.json();
        setMock(data);
        await fetchMistakes();
      } catch (err: any) {
        setErrors(prev => ({ ...prev, mock: err.message }));
        addToast('Failed to load mock details', 'error');
      } finally {
        setLoadingStates(prev => ({ ...prev, mock: false }));
      }
    };
    fetchMock();
  }, [id, fetchMistakes, addToast]);

  // Filtered mistakes
  const filteredMistakes = useMemo(() => {
    return mistakes.filter(mistake => {
      const matchesSection = !filters.section || mistake.section_name === filters.section;
      const matchesType = !filters.questionType || mistake.question_type === filters.questionType;
      const matchesAnalyzed = filters.analyzed === 'all' || 
        (filters.analyzed === 'analyzed' && mistake.analysis_text) ||
        (filters.analyzed === 'unanalyzed' && !mistake.analysis_text);
      const matchesTopic = !filters.topic || mistake.topic?.toLowerCase().includes(filters.topic.toLowerCase());
      const matchesSearch = !searchQuery || 
        mistake.analysis_text?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mistake.topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        mistake.notes?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSection && matchesType && matchesAnalyzed && matchesTopic && matchesSearch;
    });
  }, [mistakes, filters, searchQuery]);

  // Statistics
  const mistakeStats = useMemo(() => {
    const bySection = mistakes.reduce((acc, m) => {
      acc[m.section_name] = (acc[m.section_name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTopics = mistakes
      .filter(m => m.topic)
      .reduce((acc, m) => {
        acc[m.topic!] = (acc[m.topic!] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

    return {
      total: mistakes.length,
      analyzed: mistakes.filter(m => m.analysis_text).length,
      bySection,
      topTopics: Object.entries(topTopics)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
    };
  }, [mistakes]);

  // Event handlers
  const handleUploadComplete = () => {
    setShowUploader(false);
    fetchMistakes();
    addToast('Screenshots uploaded successfully', 'success');
  };

  const handleAnalyzeClick = async (mistakeId: number, analysisType: 'visual' | 'text') => {
    setLoadingStates(prev => ({ 
      ...prev, 
      updating: new Set([...prev.updating, mistakeId]) 
    }));
    
    try {
      const res = await fetch(`${API_BASE_URL}/mistakes/${mistakeId}/analyze-text`, { 
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Analysis failed');
      }
      fetchMistakes();
      addToast('Analysis completed', 'success');
    } catch (err: any) {
      addToast(`Analysis failed: ${err.message}`, 'error');
    } finally {
      setLoadingStates(prev => ({ 
        ...prev, 
        updating: new Set([...prev.updating].filter(id => id !== mistakeId)) 
      }));
    }
  };

  const handleDeleteMistake = async (mistakeId: number) => {
    if (!window.confirm('Are you sure you want to delete this mistake?')) return;
    
    setLoadingStates(prev => ({ 
      ...prev, 
      deleting: new Set([...prev.deleting, mistakeId]) 
    }));
    
    try {
      const res = await fetch(`${API_BASE_URL}/mistakes/${mistakeId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete mistake');
      
      // Close modal if this mistake was selected
      if (selectedMistake?.id === mistakeId) {
        setSelectedMistake(null);
      }
      
      fetchMistakes();
      addToast('Mistake deleted successfully', 'success');
    } catch (err: any) {
      addToast(`Failed to delete: ${err.message}`, 'error');
    } finally {
      setLoadingStates(prev => ({ 
        ...prev, 
        deleting: new Set([...prev.deleting].filter(id => id !== mistakeId)) 
      }));
    }
  };
  
  const handleBulkAnalyze = async () => {
    setLoadingStates(prev => ({ ...prev, analyzing: true }));
    
    try {
      const res = await fetch(`${API_BASE_URL}/mocks/${id}/analyze-all-mistakes`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Bulk analysis failed');
      }
      addToast('Bulk analysis completed successfully', 'success');
      fetchMistakes();
    } catch (err: any) {
      addToast(`Bulk analysis failed: ${err.message}`, 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, analyzing: false }));
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedMistakes.size} selected mistakes?`)) return;
    
    setLoadingStates(prev => ({ ...prev, deleting: selectedMistakes }));
    
    try {
      const deletePromises = Array.from(selectedMistakes).map(id =>
        fetch(`${API_BASE_URL}/mistakes/${id}`, { method: 'DELETE' })
      );
      
      const results = await Promise.allSettled(deletePromises);
      const failed = results.filter(r => r.status === 'rejected').length;
      
      if (failed > 0) {
        addToast(`${selectedMistakes.size - failed} deleted, ${failed} failed`, 'warning');
      } else {
        addToast(`${selectedMistakes.size} mistakes deleted successfully`, 'success');
      }
      
      setSelectedMistakes(new Set());
      fetchMistakes();
    } catch (err: any) {
      addToast('Bulk deletion failed', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, deleting: new Set() }));
    }
  };

  const openFocusView = (mistake: Mistake, index: number) => {
    setSelectedMistake(mistake);
    setSelectedMistakeIndex(index);
  };

  const closeFocusView = () => {
    setSelectedMistake(null);
  };

  const navigateMistake = (direction: 'next' | 'prev') => {
    const newIndex = direction === 'next' ? selectedMistakeIndex + 1 : selectedMistakeIndex - 1;
    if (newIndex >= 0 && newIndex < filteredMistakes.length) {
      setSelectedMistake(filteredMistakes[newIndex]);
      setSelectedMistakeIndex(newIndex);
    }
  };

  const handleNotesUpdate = async (mistakeId: number, newNotes: string) => {
    setLoadingStates(prev => ({ 
      ...prev, 
      updating: new Set([...prev.updating, mistakeId]) 
    }));
    
    try {
      const res = await fetch(`${API_BASE_URL}/mistakes/${mistakeId}/notes`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
      if (!res.ok) throw new Error('Failed to update notes');
      
      // Update local state
      const updatedMistakes = mistakes.map(m =>
        m.id === mistakeId ? { ...m, notes: newNotes } : m
      );
      setMistakes(updatedMistakes);
      
      // Update selected mistake if it's the same one
      if (selectedMistake?.id === mistakeId) {
        setSelectedMistake({ ...selectedMistake, notes: newNotes });
      }
    } catch (err: any) {
      addToast(`Failed to save notes: ${err.message}`, 'error');
    } finally {
      setLoadingStates(prev => ({ 
        ...prev, 
        updating: new Set([...prev.updating].filter(id => id !== mistakeId)) 
      }));
    }
  };

  const handleMistakeSelect = (mistakeId: number) => {
    const newSelected = new Set(selectedMistakes);
    if (newSelected.has(mistakeId)) {
      newSelected.delete(mistakeId);
    } else {
      newSelected.add(mistakeId);
    }
    setSelectedMistakes(newSelected);
  };

  const clearFilters = () => {
    setFilters({
      section: '',
      questionType: '',
      analyzed: 'all',
      topic: ''
    });
    setSearchQuery('');
  };

  // Loading state
  if (loadingStates.mock) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="bg-gray-800 shadow-xl rounded-lg p-6 mb-8 animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-4 w-1/3"></div>
          <div className="h-4 bg-gray-700 rounded mb-6 w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-700 p-4 rounded-lg h-20"></div>
            <div className="bg-gray-700 p-4 rounded-lg h-20"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (errors.mock) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="text-center mt-8">
          <div className="text-red-500 text-xl mb-4">Error: {errors.mock}</div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!mock) {
    return <div className="text-center mt-8 text-gray-400">Mock not found.</div>;
  }

  const hasUnanalyzedMistakes = mistakes.some(m => !m.analysis_text);
  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length + (searchQuery ? 1 : 0);

  return (
    <div className="container mx-auto p-4 md:p-8">
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      {selectedMistake && (
        <FocusViewModal
          mistake={selectedMistake}
          mistakes={filteredMistakes}
          selectedMistakeIndex={selectedMistakeIndex}
          onClose={closeFocusView}
          onNavigate={navigateMistake}
          onDelete={handleDeleteMistake}
          onAnalysisComplete={() => {
            fetchMistakes();
            const updatedMistake = mistakes.find(m => m.id === selectedMistake.id);
            if (updatedMistake) {
              setSelectedMistake(updatedMistake);
            }
          }}
        />
      )}

      {/* Mock Details Header */}
      <div className="bg-gray-800 shadow-xl rounded-lg p-6 mb-8 text-white">
        <h1 className="text-4xl font-bold mb-2">{mock.name}</h1>
        <p className="text-gray-400 text-lg mb-4">
          Taken on: {new Date(mock.date_taken).toLocaleDateString()}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
          <StatsCard
            title="Overall Score"
            value={mock.score_overall}
            color="text-green-400"
            icon="🎯"
          />
          <StatsCard
            title="Percentile"
            value={`${mock.percentile_overall}%`}
            color="text-blue-400"
            icon="📊"
          />
        </div>
      </div>

      {/* Sections Grid */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold mb-4 text-gray-200">Sections</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {mock.sections.map((section) => (
            <div key={section.id} className="bg-gray-800 shadow-lg rounded-lg p-4 text-white border border-gray-700 hover:border-gray-600 transition-all">
              <h3 className="text-xl font-semibold text-indigo-400 mb-3">{section.name}</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className="font-medium text-green-400">{section.score}</span>
                </div>
                <div className="flex justify-between">
                  <span>Correct:</span>
                  <span className="font-medium text-green-300">{section.correct_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Incorrect:</span>
                  <span className="font-medium text-red-300">{section.incorrect_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unattempted:</span>
                  <span className="font-medium text-yellow-300">{section.unattempted_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-medium text-gray-300">
                    {Math.floor(section.time_taken_seconds / 60)}m {section.time_taken_seconds % 60}s
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mistakes Statistics */}
      {mistakes.length > 0 && (
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-200">Mistake Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatsCard
              title="Total Mistakes"
              value={mistakeStats.total}
              color="text-red-400"
              icon="❌"
            />
            <StatsCard
              title="Analyzed"
              value={mistakeStats.analyzed}
              subtitle={`${Math.round((mistakeStats.analyzed / mistakeStats.total) * 100)}% complete`}
              color="text-green-400"
              icon="✅"
            />
            <StatsCard
              title="Unanalyzed"
              value={mistakeStats.total - mistakeStats.analyzed}
              color="text-yellow-400"
              icon="⏳"
            />
            <StatsCard
              title="Most Common Topic"
              value={mistakeStats.topTopics[0]?.[0] || 'None'}
              subtitle={mistakeStats.topTopics[0]?.[1] ? `${mistakeStats.topTopics[0][1]} mistakes` : ''}
              color="text-purple-400"
              icon="📚"
            />
          </div>
        </div>
      )}

      {/* Mistakes Section */}
      <div>
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-gray-200">Mistakes</h2>
            {filteredMistakes.length !== mistakes.length && (
              <span className="bg-indigo-600 text-white px-3 py-1 rounded-full text-sm">
                {filteredMistakes.length} of {mistakes.length}
              </span>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {selectedMistakes.size > 0 && (
              <>
                <button
                  onClick={handleBulkDelete}
                  disabled={loadingStates.deleting.size > 0}
                  className="bg-red-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-sm"
                >
                  Delete Selected ({selectedMistakes.size})
                </button>
                <button
                  onClick={() => setSelectedMistakes(new Set())}
                  className="bg-gray-600 text-white font-medium py-2 px-3 rounded-lg hover:bg-gray-700 text-sm"
                >
                  Clear Selection
                </button>
              </>
            )}
            
            {hasUnanalyzedMistakes && (
              <button
                onClick={handleBulkAnalyze}
                disabled={loadingStates.analyzing}
                className="bg-purple-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed text-sm"
              >
                {loadingStates.analyzing ? 'Analyzing...' : 'Analyze All'}
              </button>
            )}
            
            <button
              onClick={() => setShowUploader(!showUploader)}
              className="bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 text-sm"
            >
              {showUploader ? 'Cancel Upload' : 'Add Mistakes'}
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800 p-4 rounded-lg mb-6 border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="relative">
              <input
                type="text"
                placeholder="Search mistakes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 pl-10 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <svg className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            
            <select
              value={filters.section}
              onChange={(e) => setFilters(prev => ({ ...prev, section: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Sections</option>
              {mock.sections.map(s => (
                <option key={s.name} value={s.name}>{s.name}</option>
              ))}
            </select>
            
            <select
              value={filters.questionType}
              onChange={(e) => setFilters(prev => ({ ...prev, questionType: e.target.value }))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Types</option>
              <option value="Incorrect">Incorrect</option>
              <option value="Unattempted">Unattempted</option>
            </select>
            
            <select
              value={filters.analyzed}
              onChange={(e) => setFilters(prev => ({ ...prev, analyzed: e.target.value as 'all' | 'analyzed' | 'unanalyzed' }))}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Status</option>
              <option value="analyzed">Analyzed</option>
              <option value="unanalyzed">Unanalyzed</option>
            </select>
          </div>
          
          {/* Active Filters */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-gray-400 text-sm">Active filters:</span>
              
              {searchQuery && (
                <span className="bg-indigo-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  Search: "{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? '...' : ''}"
                  <button onClick={() => setSearchQuery('')} className="hover:text-gray-200">×</button>
                </span>
              )}
              
              {Object.entries(filters).filter(([_, value]) => value && value !== 'all').map(([key, value]) => (
                <span key={key} className="bg-purple-600 text-white px-2 py-1 rounded-full text-xs flex items-center gap-1">
                  {key}: {value}
                  <button 
                    onClick={() => setFilters(prev => ({ 
                      ...prev, 
                      [key]: key === 'analyzed' ? 'all' : '' 
                    }))}
                    className="hover:text-gray-200"
                  >
                    ×
                  </button>
                </span>
              ))}
              
              <button 
                onClick={clearFilters}
                className="text-gray-400 hover:text-white text-sm underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Upload Section */}
        {showUploader && (
          <div className="bg-gray-800 p-6 rounded-lg mb-8 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Add New Mistakes</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="section" className="block text-sm font-medium text-gray-300 mb-2">
                  Section <span className="text-red-400">*</span>
                </label>
                <select
                  id="section"
                  value={selectedSection}
                  onChange={(e) => setSelectedSection(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a Section</option>
                  {mock.sections.map(s => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="questionType" className="block text-sm font-medium text-gray-300 mb-2">
                  Question Type <span className="text-red-400">*</span>
                </label>
                <select
                  id="questionType"
                  value={selectedQuestionType}
                  onChange={(e) => setSelectedQuestionType(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Type</option>
                  <option value="Incorrect">Incorrect</option>
                  <option value="Unattempted">Unattempted</option>
                </select>
              </div>
            </div>
            
            {selectedSection && selectedQuestionType && mock ? (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-750">
                <ScreenshotUploader
                  mockId={mock.id}
                  sectionName={selectedSection}
                  questionType={selectedQuestionType}
                  onUploadComplete={handleUploadComplete}
                />
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center text-gray-400">
                <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-lg font-medium mb-2">Ready to Upload</p>
                <p>Please select both section and question type to begin uploading screenshots.</p>
              </div>
            )}
          </div>
        )}

        {/* Mistakes Grid */}
        {loadingStates.mistakes ? (
          <div className={`grid gap-6 grid-cols-${gridCols}`}>
            {[...Array(6)].map((_, i) => (
              <MistakeCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredMistakes.length > 0 ? (
          <div className={`grid gap-6 ${
            gridCols === 1 ? 'grid-cols-1' :
            gridCols === 2 ? 'grid-cols-1 md:grid-cols-2' :
            gridCols === 3 ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {filteredMistakes.map((mistake, index) => (
              <div
                key={mistake.id}
                className={`bg-gray-800 rounded-lg shadow-md border transition-all duration-200 hover:shadow-lg ${
                  selectedMistakes.has(mistake.id) 
                    ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-50' 
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                {/* Selection checkbox */}
                <div className="absolute top-2 left-2 z-10">
                  <input
                    type="checkbox"
                    checked={selectedMistakes.has(mistake.id)}
                    onChange={() => handleMistakeSelect(mistake.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                  />
                </div>

                {/* Loading overlay */}
                {(loadingStates.deleting.has(mistake.id) || loadingStates.updating.has(mistake.id)) && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20 rounded-lg">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">
                        {loadingStates.deleting.has(mistake.id) ? 'Deleting...' : 'Updating...'}
                      </p>
                    </div>
                  </div>
                )}

                <div 
                  className="cursor-pointer"
                  onClick={() => openFocusView(mistake, index)}
                >
                  <ProgressiveImage
                    src={`${process.env.NEXT_PUBLIC_API_URL}/api/uploads/${mistake.image_path}`}
                    alt={`Mistake ${mistake.id}`}
                    className="w-full h-48 object-cover rounded-t-lg"
                  />
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className="text-sm text-gray-400 mb-1">
                        <span className="font-medium">{mistake.section_name}</span>
                        <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                          mistake.question_type === 'Incorrect' 
                            ? 'bg-red-900 text-red-200' 
                            : 'bg-yellow-900 text-yellow-200'
                        }`}>
                          {mistake.question_type}
                        </span>
                      </p>
                    </div>
                  </div>

                  {mistake.analysis_text ? (
                    <div className="mb-4">
                      {mistake.topic && (
                        <h4 className="font-semibold text-indigo-400 mb-2 text-sm">
                          📚 {mistake.topic}
                        </h4>
                      )}
                      <p className="text-gray-300 text-sm line-clamp-3 leading-relaxed">
                        {mistake.analysis_text}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <p className="text-gray-500 text-sm mb-3 italic">No analysis yet</p>
                      <div className="flex flex-wrap gap-2">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            handleAnalyzeClick(mistake.id, 'visual');
                          }} 
                          disabled={loadingStates.updating.has(mistake.id)}
                          className="flex-1 min-w-0 text-xs bg-green-600 text-white font-medium py-2 px-3 rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors"
                        >
                          🔍 Visual
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation(); 
                            handleAnalyzeClick(mistake.id, 'text');
                          }} 
                          disabled={loadingStates.updating.has(mistake.id)}
                          className="flex-1 min-w-0 text-xs bg-yellow-600 text-white font-medium py-2 px-3 rounded-lg hover:bg-yellow-700 disabled:bg-yellow-400 transition-colors"
                        >
                          📝 Text
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Notes section */}
                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Notes:</label>
                    <textarea
                      value={localNotes[mistake.id] || ''}
                      onChange={(e) => setLocalNotes(prev => ({ ...prev, [mistake.id]: e.target.value }))}
                      onClick={(e) => e.stopPropagation()}
                      placeholder="Add your notes..."
                      className="w-full bg-gray-700 border border-gray-600 rounded text-white text-xs p-2 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => openFocusView(mistake, index)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      View Details →
                    </button>
                    
                    <button 
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        handleDeleteMistake(mistake.id);
                      }} 
                      disabled={loadingStates.deleting.has(mistake.id)}
                      className="text-xs text-red-400 hover:text-red-300 disabled:text-red-600 transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : mistakes.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-gray-500 text-6xl mb-4">📚</div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">No mistakes added yet</h3>
            <p className="text-gray-500 mb-6">Start by uploading screenshots of questions you got wrong or didn't attempt.</p>
            <button
              onClick={() => setShowUploader(true)}
              className="bg-blue-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Mistake
            </button>
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="text-gray-500 text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-medium text-gray-400 mb-2">No mistakes match your filters</h3>
            <p className="text-gray-500 mb-6">Try adjusting your search criteria or clearing the filters.</p>
            <button
              onClick={clearFilters}
              className="bg-indigo-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Load more button if needed (for pagination) */}
        {filteredMistakes.length > 0 && filteredMistakes.length === mistakes.length && mistakes.length >= 20 && (
          <div className="text-center mt-8">
            <button className="bg-gray-700 text-white font-medium py-2 px-6 rounded-lg hover:bg-gray-600 transition-colors">
              Load More Mistakes
            </button>
          </div>
        )}
      </div>

      {/* Keyboard shortcuts help */}
      {selectedMistake && (
        <div className="fixed bottom-4 left-4 bg-gray-900 bg-opacity-90 backdrop-blur-sm text-white p-3 rounded-lg text-xs z-40">
          <div className="font-medium mb-1">Keyboard Shortcuts:</div>
          <div className="space-y-1 text-gray-300">
            <div>← → Navigate</div>
            <div>Esc Close</div>
            <div>Shift+Del Delete</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MockDetailPage;