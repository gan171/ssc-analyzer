'use client';

import { useState, FormEvent } from 'react';

type MockFormProps = {
  onMockAdded: () => void;
};

export default function MockForm({ onMockAdded }: MockFormProps) {
  const [name, setName] = useState('');
  const [score, setScore] = useState('');
  const [percentile, setPercentile] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    const mockData = {
      name: name,
      score_overall: parseFloat(score),
      percentile_overall: parseFloat(percentile),
    };

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/mocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(mockData),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const result = await response.json();
      console.log('Server response:', result);
      alert('Mock created successfully!');

      // Clear the form
      setName('');
      setScore('');
      setPercentile('');
      onMockAdded(); // Refresh the list on the main page

    } catch (error) {
      console.error('Error submitting mock data:', error);
      alert('Failed to create mock. See console for details.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-8 mb-12 flex flex-col gap-4 w-full max-w-md bg-gray-900 p-6 rounded-lg mx-auto">
      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1">Mock Test Name</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="block w-full rounded-md border-gray-600 bg-gray-700 shadow-sm text-white p-2 focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label htmlFor="score" className="block text-sm font-medium mb-1">Overall Score</label>
        <input
          type="number"
          id="score"
          step="0.01"
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="block w-full rounded-md border-gray-600 bg-gray-700 shadow-sm text-white p-2 focus:border-indigo-500 focus:ring-indigo-500"
          required
        />
      </div>
      <div>
        <label htmlFor="percentile" className="block text-sm font-medium mb-1">Overall Percentile</label>
        <input
          type="number"
          id="percentile"
          step="0.01"
          value={percentile}
          onChange={(e) => setPercentile(e.target.value)}
          className="block w-full rounded-md border-gray-600 bg-gray-700 shadow-sm text-white p-2 focus:border-indigo-500 focus:ring-indigo-500"
        />
      </div>
      <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
        Add Mock
      </button>
    </form>
  );
}