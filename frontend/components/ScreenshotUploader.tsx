// frontend/components/ScreenshotUploader.tsx

"use client";

import { useState, useRef } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  
  // --- NEW STATE FOR LOADING/ANALYSIS ---
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

    // --- START UPLOAD LOADING STATE ---
    setIsUploading(true);
    toast.info("Uploading screenshots...");

    const formData = new FormData();
    files.forEach((file) => {
      formData.append("screenshots", file);
    });
    formData.append("section_name", sectionName);
    formData.append("question_type", questionType);

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
      if(fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("An error occurred during upload.");
    } finally {
      // --- END UPLOAD LOADING STATE ---
      setIsUploading(false);
    }
  };
  
  // --- NEW FUNCTION FOR BULK ANALYSIS ---
  const handleBulkAnalyze = async () => {
    // --- START ANALYSIS LOADING STATE ---
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
        // --- END ANALYSIS LOADING STATE ---
        setIsAnalyzing(false);
    }
  };


  return (
    <div className="p-4 border rounded-lg bg-gray-50 shadow-md">
       <ToastContainer position="bottom-right" autoClose={5000} hideProgressBar={false} />
      <h3 className="text-lg font-semibold mb-2">Upload Mistake Screenshots</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="sectionName" className="block text-sm font-medium text-gray-700">Section</label>
          <select
            id="sectionName"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            // --- DISABLE DURING OPERATIONS ---
            disabled={isUploading || isAnalyzing}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
          >
            <option>Reasoning</option>
            <option>General Awareness</option>
            <option>Quantitative Aptitude</option>
            <option>English Comprehension</option>
          </select>
        </div>

        <div>
           {/* File input and other form elements here... they can also be disabled with `isUploading || isAnalyzing` */}
        </div>
        
        <button
            type="submit"
            // --- DISABLE BUTTON AND SHOW FEEDBACK ---
            disabled={isUploading || isAnalyzing}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
          >
            {isUploading && <Spinner />}
            {isUploading ? 'Uploading...' : 'Upload Screenshots'}
          </button>
      </form>
      
      <div className="mt-4 pt-4 border-t">
         <button
            onClick={handleBulkAnalyze}
            // --- DISABLE BUTTON AND SHOW FEEDBACK ---
            disabled={isAnalyzing || isUploading}
            className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400"
          >
            {isAnalyzing && <Spinner />}
            {isAnalyzing ? 'Analyzing All...' : 'Analyze All Unanalyzed Mistakes'}
          </button>
      </div>

    </div>
  );
}