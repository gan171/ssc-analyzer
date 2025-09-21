'use client';

import { useState, FormEvent } from 'react';

type MockFormProps = {
  onMockAdded: () => void;
};

// Defines the structure for a single section's data
const initialSection = { 
  name: '', 
  score: '', 
  correct_count: '', 
  incorrect_count: '', 
  unattempted_count: '', 
  time_taken_seconds: '' 
};

// We start with the 4 default sections for the SSC CGL Prelims exam
const initialSections = [
  { ...initialSection, name: 'Reasoning' },
  { ...initialSection, name: 'General Awareness' },
  { ...initialSection, name: 'Quantitative Aptitude' },
  { ...initialSection, name: 'English Comprehension' },
];

export default function MockForm({ onMockAdded }: MockFormProps) {
  const [name, setName] = useState('');
  const [overallScore, setOverallScore] = useState('');
  const [percentile, setPercentile] = useState('');
  const [sections, setSections] = useState(initialSections);
  const [error, setError] = useState<string | null>(null);


  // This function updates the state when you type into any of the section input fields
  const handleSectionChange = (index: number, field: string, value: string) => {
    const updatedSections = [...sections];
    updatedSections[index][field] = value;
    setSections(updatedSections);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    
    // Prepare the data in the format our backend expects
    const payload = {
      name,
      score_overall: parseFloat(overallScore),
      percentile_overall: parseFloat(percentile),
      sections: sections.map(s => ({
        ...s,
        score: parseFloat(s.score) || 0,
        correct_count: parseInt(s.correct_count, 10) || 0,
        incorrect_count: parseInt(s.incorrect_count, 10) || 0,
        unattempted_count: parseInt(s.unattempted_count, 10) || 0,
        // We'll enter time in minutes and convert it to seconds for the backend
        time_taken_seconds: (parseInt(s.time_taken_seconds, 10) || 0) * 60,
      })),
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Network response was not ok');
      }

      alert('Mock created successfully!');
      // Reset the form after successful submission
      setName('');
      setOverallScore('');
      setPercentile('');
      setSections(initialSections);
      onMockAdded(); // This refreshes the mock list on the homepage

    } catch (error: any) {
      console.error('Error submitting mock data:', error);
      setError(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 mb-12 flex flex-col gap-6 w-full max-w-lg bg-gray-900 p-6 rounded-lg mx-auto">
      {/* Overall Mock Details */}
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">Mock Test Name</label>
          <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="block w-full rounded-md border-gray-600 bg-gray-700 shadow-sm text-white p-2" required />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="score_overall" className="block text-sm font-medium mb-1">Overall Score</label>
            <input type="number" step="0.01" id="score_overall" value={overallScore} onChange={(e) => setOverallScore(e.target.value)} className="block w-full rounded-md border-gray-600 bg-gray-700 shadow-sm text-white p-2" required />
          </div>
          <div>
            <label htmlFor="percentile" className="block text-sm font-medium mb-1">Overall Percentile</label>
            <input type="number" step="0.01" id="percentile" value={percentile} onChange={(e) => setPercentile(e.target.value)} className="block w-full rounded-md border-gray-600 bg-gray-700 shadow-sm text-white p-2" />
          </div>
        </div>
      </div>

      <hr className="my-2 border-gray-700"/>

      {/* Sectional Details */}
      <div className="flex flex-col gap-6">
        {sections.map((section, index) => (
          <div key={index} className="p-4 border border-gray-700 rounded-md">
            <h3 className="text-lg font-semibold text-white mb-3">{section.name}</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label className="block text-xs font-medium">Score</label>
                <input type="number" step="0.01" value={section.score} onChange={(e) => handleSectionChange(index, 'score', e.target.value)} className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm text-white p-2" required />
              </div>
              <div>
                <label className="block text-xs font-medium">Time (Mins)</label>
                <input type="number" value={section.time_taken_seconds} onChange={(e) => handleSectionChange(index, 'time_taken_seconds', e.target.value)} className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm text-white p-2" required />
              </div>
              <div>
                <label className="block text-xs font-medium">Correct</label>
                <input type="number" value={section.correct_count} onChange={(e) => handleSectionChange(index, 'correct_count', e.target.value)} className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm text-white p-2" required />
              </div>
              <div>
                <label className="block text-xs font-medium">Incorrect</label>
                <input type="number" value={section.incorrect_count} onChange={(e) => handleSectionChange(index, 'incorrect_count', e.target.value)} className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm text-white p-2" required />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium">Unattempted</label>
                <input type="number" value={section.unattempted_count} onChange={(e) => handleSectionChange(index, 'unattempted_count', e.target.value)} className="mt-1 block w-full rounded-md border-gray-600 bg-gray-800 shadow-sm text-white p-2" required />
              </div>
            </div>
          </div>
        ))}
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}


      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Add Mock
      </button>
    </form>
  );
}