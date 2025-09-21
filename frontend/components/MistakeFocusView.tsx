'use client';

import React, { useState, useEffect } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

// --- Type Definitions ---
interface Mistake {
  id: number;
  question_number: number;
  topic: string;
  sub_topic?: string;
  mistake_type: string;
  image_path: string; // Using image_path now
  analysis_text: string; // analysis_text instead of explanation
  notes: string;
}

// --- Props Definition ---
interface MistakeFocusViewProps {
  mistake: Mistake;
  onClose: () => void;
  onNavigate: (direction: 'next' | 'prev') => void;
  onNotesUpdate: (mistakeId: number, newNotes: string) => void;
}

// --- Helper Components for Icons ---
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>;
const ZoomInIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>;
const ZoomOutIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" /></svg>;
const ResetZoomIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" /></svg>;
const InvertColorsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>;


// --- Main Component ---
export default function MistakeFocusView({ mistake, onClose, onNavigate, onNotesUpdate }: MistakeFocusViewProps) {
    const [isInverted, setIsInverted] = useState(false);
    const [currentNotes, setCurrentNotes] = useState(mistake.notes || '');

    // Update notes when mistake changes
    useEffect(() => {
        setCurrentNotes(mistake.notes || '');
    }, [mistake]);

    const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentNotes(e.target.value);
    };

    const handleSaveNotes = () => {
        onNotesUpdate(mistake.id, currentNotes);
        // Add a visual cue for saving, e.g., a toast notification
        alert("Notes saved!");
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') onNavigate('next');
            if (e.key === 'ArrowLeft') onNavigate('prev');
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onNavigate, onClose]);


    const analysis = mistake.analysis_text || "";
    const coreConcept = analysis.split('Your Mistake:')[0] || 'AI analysis needed.';
    const yourMistake = analysis.split('Your Mistake:')[1]?.split('Correct Steps:')[0] || 'N/A';
    const correctSteps = analysis.split('Correct Steps:')[1]?.split('Key Takeaway:')[0] || 'N/A';
    const keyTakeaway = analysis.split('Key Takeaway:')[1] || 'N/A';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center animate-fade-in">
            {/* --- Main Grid Layout --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full">

                {/* --- Left Pane: Image Viewer --- */}
                <div className="relative h-full flex flex-col items-center justify-center p-4 bg-gray-900">
                    <TransformWrapper>
                        {({ zoomIn, zoomOut, resetTransform }) => (
                            <>
                                <TransformComponent wrapperClass="w-full h-full flex items-center justify-center">
                                    <img
                                        src={`${process.env.NEXT_PUBLIC_API_URL}/uploads/${mistake.image_path}`}
                                        alt={`Question ${mistake.question_number}`}
                                        className={`max-w-full max-h-full object-contain ${isInverted ? 'invert' : ''}`}
                                    />
                                </TransformComponent>
                                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center space-x-2 bg-gray-800 p-2 rounded-lg shadow-lg">
                                    <button onClick={() => zoomIn()} className="p-2 hover:bg-gray-700 rounded"><ZoomInIcon/></button>
                                    <button onClick={() => zoomOut()} className="p-2 hover:bg-gray-700 rounded"><ZoomOutIcon/></button>
                                    <button onClick={() => resetTransform()} className="p-2 hover:bg-gray-700 rounded"><ResetZoomIcon/></button>
                                    <button onClick={() => setIsInverted(!isInverted)} className={`p-2 hover:bg-gray-700 rounded ${isInverted ? 'bg-indigo-600' : ''}`}><InvertColorsIcon/></button>
                                </div>
                            </>
                        )}
                    </TransformWrapper>
                </div>

                {/* --- Right Pane: Analysis Hub --- */}
                <div className="h-full bg-gray-800 p-6 md:p-8 overflow-y-auto text-white">
                    {/* Metadata Tags */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        <span className="bg-indigo-600 text-xs font-semibold px-3 py-1 rounded-full">Topic: {mistake.topic}</span>
                        {mistake.sub_topic && <span className="bg-blue-600 text-xs font-semibold px-3 py-1 rounded-full">Sub-Topic: {mistake.sub_topic}</span>}
                        <span className="bg-red-600 text-xs font-semibold px-3 py-1 rounded-full">Type: {mistake.mistake_type}</span>
                    </div>

                    <div className="space-y-6">
                        {/* 🎯 Core Concept */}
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-indigo-400">🎯 Core Concept</h3>
                            <p className="text-gray-300 bg-gray-900/50 p-3 rounded-md">{coreConcept}</p>
                        </div>
                        
                        {/* 🤔 Your Approach vs. The Correct Approach */}
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-indigo-400">🤔 Your Approach vs. Correct Approach</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-red-900/30 p-3 rounded-md">
                                    <h4 className="font-semibold text-red-400">Your Mistake</h4>
                                    <p className="text-sm text-gray-300">{yourMistake}</p>
                                </div>
                                <div className="bg-green-900/30 p-3 rounded-md">
                                    <h4 className="font-semibold text-green-400">Correct Steps</h4>
                                    <p className="text-sm text-gray-300 whitespace-pre-line">{correctSteps}</p>
                                </div>
                            </div>
                        </div>

                        {/* 💡 Key Takeaway */}
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-indigo-400">💡 Key Takeaway</h3>
                            <p className="text-gray-300 bg-gray-900/50 p-3 rounded-md">{keyTakeaway}</p>
                        </div>
                        
                        {/* ✍️ Personal Notes */}
                        <div>
                            <h3 className="font-bold text-lg mb-2 text-indigo-400">✍️ Personal Notes</h3>
                            <div className="bg-yellow-200/10 p-4 rounded-md">
                                <textarea
                                    className="w-full h-24 bg-transparent text-yellow-200 placeholder-yellow-200/50 border-0 focus:ring-0 resize-none"
                                    placeholder="Add your own thoughts here..."
                                    value={currentNotes}
                                    onChange={handleNotesChange}
                                />
                                <div className="text-right mt-2">
                                    <button 
                                        onClick={handleSaveNotes}
                                        className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-1 px-3 text-sm rounded transition-colors"
                                    >
                                        Save Notes
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- Navigation and Close Buttons --- */}
            <button onClick={onClose} className="absolute top-4 right-4 text-white hover:text-indigo-400"><CloseIcon/></button>
            <button onClick={() => onNavigate('prev')} className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-indigo-400 p-2 bg-black/50 rounded-full"><ChevronLeftIcon/></button>
            <button onClick={() => onNavigate('next')} className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-indigo-400 p-2 bg-black/50 rounded-full"><ChevronRightIcon/></button>
        </div>
    );
}