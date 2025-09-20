'use client';

import { useState, ChangeEvent, FormEvent, DragEvent } from 'react';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

type UploaderProps = {
  mockId: string;
  onUploadSuccess: () => void;
};

export default function ScreenshotUploader({ mockId, onUploadSuccess }: UploaderProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      // Convert FileList to an array and add to existing files
      setFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files!)]);
    }
  };

  const handleDrag = (e: DragEvent<HTMLLabelElement>, dragStatus: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(dragStatus);
  };

  const handleDrop = (e: DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(prevFiles => [...prevFiles, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (files.length === 0) {
      alert('Please select files first!');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files[]', file); // Use 'files[]' to send as a list
    });

    try {
      const response = await fetch(`${API_URL}/api/mocks/${mockId}/mistakes`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('File upload failed');

      alert(`${files.length} screenshots uploaded successfully!`);
      onUploadSuccess();
    } catch (error) {
      console.error(error);
      alert('An error occurred during upload.');
    } finally {
      setUploading(false);
      setFiles([]); // Clear the files list
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <label 
        htmlFor="file-upload" 
        className={`flex flex-col items-center justify-center w-full h-32 px-4 transition bg-gray-800 border-2 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 focus:outline-none ${isDragging ? "border-green-400" : "border-gray-600"}`}
        onDragEnter={(e) => handleDrag(e, true)}
        onDragLeave={(e) => handleDrag(e, false)}
        onDragOver={(e) => handleDrag(e, true)}
        onDrop={handleDrop}
      >
        <span className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="font-medium text-gray-400">
            Drop files to Attach, or <span className="text-blue-400 underline">browse</span>
          </span>
        </span>
        <input 
          id="file-upload"
          type="file" 
          name="files[]"
          className="hidden" // We hide the default input
          onChange={handleFileChange} 
          accept="image/png, image/jpeg"
          multiple // <-- This allows selecting multiple files
        />
      </label>

      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="font-semibold">Selected Files:</h4>
          <ul className="list-disc list-inside text-sm text-gray-300">
            {files.map((file, i) => <li key={i}>{file.name}</li>)}
          </ul>
        </div>
      )}

      <button 
        type="submit" 
        className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:bg-gray-500 disabled:cursor-not-allowed"
        disabled={files.length === 0 || uploading}
      >
        {uploading ? 'Uploading...' : `Upload ${files.length} Screenshot(s)`}
      </button>
    </form>
  );
}