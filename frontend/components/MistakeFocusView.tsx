"use client";
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// --- Interface Definitions ---
interface Mistake {
  id: number;
  image_path: string;
  analysis_text: string | null;
  topic: string | null;
  notes: string | null;
}

interface MistakeFocusViewProps {
  mistake: Mistake;
  onAnalysisComplete: () => void;
  onDelete: (mistakeId: number) => void;
}

// --- Helper Components ---
const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

// --- Main Component ---
export default function MistakeFocusView({ mistake, onAnalysisComplete, onDelete }: MistakeFocusViewProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [currentNotes, setCurrentNotes] = useState(mistake.notes || '');
  const [isInverted, setIsInverted] = useState(false);

  useEffect(() => {
    setCurrentNotes(mistake.notes || '');
  }, [mistake]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    toast.info('Analyzing mistake...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mistakes/${mistake.id}/analyze-text`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Failed to analyze mistake');
      toast.success('Analysis complete!');
      onAnalysisComplete();
    } catch (error) {
      console.error('Analysis error:', error);
      toast.error('An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleDelete = async () => {
      toast(
        ({ closeToast }) => (
          <div className="flex flex-col p-1">
            <p className="font-semibold text-white">Are you sure?</p>
            <p className="text-sm text-gray-300">This action cannot be undone.</p>
            <div className="flex justify-end mt-3 space-x-2">
               <button onClick={closeToast} className="px-3 py-1 text-sm rounded bg-gray-700 hover:bg-gray-600 text-white">Cancel</button>
               <button onClick={async () => {
                  closeToast();
                  setIsDeleting(true);
                  try {
                      await onDelete(mistake.id);
                      toast.success('Mistake deleted.');
                  } catch (error) {
                      toast.error('Failed to delete mistake.');
                  } finally {
                      setIsDeleting(false);
                  }
               }} className="px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-700 text-white">Delete</button>
            </div>
          </div>
        ), { 
            autoClose: false, 
            closeButton: false, 
            style: { backgroundColor: '#1f2937', color: 'white' }
        }
      );
  };

  const handleSaveNotes = async () => {
    toast.info('Saving note...');
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/mistakes/${mistake.id}/notes`, {
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

  return (
    // Use h-screen to constrain the component to the viewport height
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-4 h-screen bg-gray-900 text-white">
      
      {/* --- LEFT COLUMN: Image Viewer --- */}
      {/* It will scroll independently if the screen is too short */}
      <div className="flex flex-col bg-gray-800 rounded-lg p-4 overflow-y-auto">
          <h3 className="text-lg font-bold mb-2 flex-shrink-0">Question Screenshot</h3>
           <TransformWrapper>
            {({ zoomIn, zoomOut, resetTransform }) => (
              <>
                <div className="flex items-center space-x-2 mb-2 flex-shrink-0">
                  <button onClick={() => zoomIn()} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 text-xs">Zoom In</button>
                  <button onClick={() => zoomOut()} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 text-xs">Zoom Out</button>
                  <button onClick={() => resetTransform()} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 text-xs">Reset</button>
                  <button onClick={() => setIsInverted(!isInverted)} className="p-2 bg-gray-700 rounded-md hover:bg-gray-600 text-xs">
                    {isInverted ? 'Normal' : 'Invert'}
                  </button>
                </div>
                <div className="flex-grow flex items-center justify-center rounded-lg overflow-hidden border border-gray-700 min-h-[200px]">
                    <TransformComponent wrapperClass="w-full h-full" contentClass="w-full h-full">
                        <img
                            src={`${process.env.NEXT_PUBLIC_API_URL}/api/uploads/${mistake.image_path}`}
                            alt="Mistake screenshot"
                            className={`max-w-full max-h-full object-contain cursor-grab ${isInverted ? 'filter invert' : ''}`}
                        />
                    </TransformComponent>
                </div>
              </>
            )}
          </TransformWrapper>
      </div>

      {/* --- RIGHT COLUMN: Analysis, Notes, and Actions --- */}
      {/* This column is constrained by the parent's h-screen */}
      <div className="flex flex-col space-y-4 overflow-hidden">
        
        {/* Your Note Section (Fixed Height) */}
        <div className="bg-gray-800 rounded-lg p-4 flex-shrink-0">
            <h3 className="text-lg font-bold mb-2">Your Note / Mistake Description</h3>
            {isEditingNotes ? (
              <div className="space-y-2">
                  <textarea
                    value={currentNotes}
                    onChange={(e) => setCurrentNotes(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 sm:text-sm"
                    rows={4}
                    placeholder="e.g., 'I confused the formula for simple and compound interest...'"
                  />
                  <div className="flex justify-end space-x-2">
                      <button onClick={() => setIsEditingNotes(false)} className="px-3 py-1 text-sm font-medium rounded-md bg-gray-600 hover:bg-gray-500">Cancel</button>
                      <button onClick={handleSaveNotes} className="px-3 py-1 text-sm font-medium rounded-md bg-indigo-600 hover:bg-indigo-700">Save Note</button>
                  </div>
              </div>
            ) : (
              <div className="space-y-3">
                  <p className="text-gray-300 text-sm whitespace-pre-wrap min-h-[4rem]">
                    {mistake.notes || <span className="text-gray-500 italic">No note added yet. Click edit to add your analysis.</span>}
                  </p>
                  <div className="flex justify-end">
                    <button onClick={() => setIsEditingNotes(true)} className="px-3 py-1 text-sm font-medium rounded-md bg-gray-700 hover:bg-gray-600">{mistake.notes ? 'Edit Note' : 'Add Note'}</button>
                  </div>
              </div>
            )}
        </div>

        {/* AI Analysis Section (Scrollable & Flexible) */}
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col flex-grow min-h-0">
            <h3 className="text-lg font-bold mb-2">AI Analysis</h3>
            {/* This inner div is the one that actually scrolls */}
            <div className="text-gray-300 text-sm whitespace-pre-wrap overflow-y-auto flex-grow bg-gray-900 rounded p-3 border border-gray-700">
                {mistake.analysis_text ? (
                    mistake.analysis_text
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500 italic">This mistake has not been analyzed yet. {mistake.notes ? "" : "Add a note for better results!"}</p>
                    </div>
                )}
            </div>
        </div>

        {/* Action Buttons (Fixed Height) */}
        <div className="flex space-x-4 flex-shrink-0">
            <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !!mistake.analysis_text}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
            >
                {isAnalyzing && <Spinner />}
                {mistake.analysis_text ? 'Analyzed' : 'Analyze Now'}
            </button>
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-gray-500"
            >
                {isDeleting && <Spinner />}
                Delete Mistake
            </button>
        </div>
      </div>
    </div>
  );
}