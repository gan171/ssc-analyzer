"use client";

import { useState, useRef } from "react";
import { ToastContainer, toast } from 'react-toastify';
// REMOVED: The problematic CSS import is no longer here.
// It has been moved to the main layout file.

interface ScreenshotUploaderProps {
  mockId: number;
  onUploadComplete: () => void;
}

// A simple spinner component for visual feedback
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


export default function ScreenshotUploader({ mockId, onUploadComplete }: ScreenshotUploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [sectionName, setSectionName] = useState("Reasoning");
  const [questionType, setQuestionType] = useState("incorrect");
  
  // NEW: State to hold the user's description of their mistake
  const [mistakeDescription, setMistakeDescription] = useState('');
  
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (files.length === 0) {
      toast.error("Please select at least one screenshot.");
      return;
    }

    setIsUploading(true);
    toast.info("Uploading screenshots...");

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("screenshots", file);
    });
    formData.append("section_name", sectionName);
    formData.append("question_type", questionType);
    
    // NEW: Add the user's mistake description to the form data
    formData.append("mistake_description", mistakeDescription);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/mocks/${mockId}/mistakes`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload screenshots");
      }

      toast.success("Screenshots uploaded successfully!");
      onUploadComplete(); // Refresh the mistakes list
      setFiles([]); // Clear the file input
      setMistakeDescription(''); // NEW: Clear the description field
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };
  
  const handleBulkAnalyze = async () => {
    setIsAnalyzing(true);
    toast.info("Starting bulk analysis. This may take a while...");

    try {
        const response = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/mocks/${mockId}/analyze-all-mistakes`,
            {
                method: "POST",
            }
        );

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || "Failed to analyze mistakes");
        }
        
        const result = await response.json();
        toast.success(result.message || "Analysis complete!");
        onUploadComplete(); // Refresh the list to show new analysis

    } catch (error) {
        console.error("Bulk analysis error:", error);
        toast.error((error as Error).message || "An error occurred during analysis.");
    } finally {
        setIsAnalyzing(false);
    }
  };


  return (
    // CHANGED: Updated styling to be more modern and dark-theme friendly
    <div className="p-6 border border-gray-700 rounded-xl bg-gray-800 shadow-lg">
        <ToastContainer theme="dark" position="bottom-right" autoClose={5000} hideProgressBar={false} />
      <h3 className="text-xl font-semibold mb-4 text-white">Upload Mistake Screenshots</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sectionName" className="block text-sm font-medium text-gray-300">Section</label>
          <select
            id="sectionName"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            disabled={isUploading || isAnalyzing}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-gray-700 border-gray-600 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>Reasoning</option>
            <option>General Awareness</option>
            <option>Quantitative Aptitude</option>
            <option>English Comprehension</option>
          </select>
        </div>
        
        {/* NEW: Textarea for mistake description, moved into the form */}
        <div>
            <label htmlFor="mistakeDescription" className="block text-sm font-medium text-gray-300 mb-1">
                Describe Your Mistake (Optional but Recommended)
            </label>
            <textarea
                id="mistakeDescription"
                value={mistakeDescription}
                onChange={(e) => setMistakeDescription(e.target.value)}
                disabled={isUploading || isAnalyzing}
                className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                rows={3}
                placeholder="e.g., 'I got confused between two options', 'I made a silly calculation error', 'I didn't know the formula'"
            />
        </div>

        <div>
            <label htmlFor="file-upload" className="block text-sm font-medium text-gray-300">Screenshots</label>
            <input 
                id="file-upload"
                type="file" 
                multiple 
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading || isAnalyzing}
                className="mt-1 block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600"
            />
        </div>
        
        <button
            type="submit"
            disabled={isUploading || isAnalyzing}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isUploading && <Spinner />}
            {isUploading ? 'Uploading...' : 'Upload Screenshots'}
          </button>
      </form>
      
      <div className="mt-4 pt-4 border-t border-gray-700">
         <button
            onClick={handleBulkAnalyze}
            disabled={isAnalyzing || isUploading}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            {isAnalyzing && <Spinner />}
            {isAnalyzing ? 'Analyzing All...' : 'Analyze All Unanalyzed Mistakes'}
          </button>
      </div>

    </div>
  );
}

