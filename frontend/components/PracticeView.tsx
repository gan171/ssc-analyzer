"use client";

import { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://127.0.0.1:5001/api';

interface Mistake {
  id: number;
  image_path: string;
  analysis_text: string | null;
  question_text: string | null;
  options: string[] | null;
  correct_option: string | null;
  difficulty: string;
}

interface PracticeViewProps {
  sectionName: string;
  onBack: () => void;
}

const PracticeView = ({ sectionName, onBack }: PracticeViewProps) => {
  const [mistakes, setMistakes] = useState<Mistake[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);

  useEffect(() => {
    const fetchMistakes = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/practice/quiz`, {
          params: { section_name: sectionName },
        });
        setMistakes(response.data);
      } catch (error) {
        console.error('Error fetching mistakes:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMistakes();
  }, [sectionName]);

  const handleDifficultySubmit = async (difficulty: string) => {
    const currentMistake = mistakes[currentIndex];
    const imageUrl = `${API_URL}/uploads/${currentMistake.image_path}`;
    try {
      const response = await axios.post(`${API_URL}/practice/submit`, {
        mistake_id: currentMistake.id,
        difficulty: difficulty,
      });
      
      const updatedMistakes = [...mistakes];
      updatedMistakes[currentIndex] = response.data;
      setMistakes(updatedMistakes);
      setShowAnalysis(true);

    } catch (error) {
      console.error('Error submitting difficulty:', error);
    }
  };
  
  const handleNext = () => {
    setShowAnalysis(false);
    if (currentIndex < mistakes.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Quiz finished
      alert("You've completed all your mistakes for this section!");
      onBack();
    }
  };

  if (isLoading) {
    return <div className="text-center p-10">Loading your mistakes...</div>;
  }

  if (mistakes.length === 0) {
    return (
      <div className="text-center p-10">
        <p>No mistakes found for {sectionName}. Great job!</p>
        <button onClick={onBack} className="mt-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
          Back
        </button>
      </div>
    );
  }

  const currentMistake = mistakes[currentIndex];
  const imageUrl = `${API_URL}/uploads/${currentMistake.image_path}`;


  return (
    <div className="container mx-auto p-4">
      <button onClick={onBack} className="mb-4 bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">
        &larr; Change Section
      </button>
      <h2 className="text-2xl font-bold mb-4">
        Practicing {sectionName} - Question {currentIndex + 1} of {mistakes.length}
      </h2>
      <div className="border rounded-lg p-4">
        <img src={imageUrl} alt={`Mistake ${currentMistake.id}`} className="max-w-full h-auto rounded-md" />
      </div>

      {!showAnalysis ? (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">How difficult was this question?</h3>
          <div className="flex space-x-4">
            <button onClick={() => handleDifficultySubmit('Forgot')} className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded">Forgot</button>
            <button onClick={() => handleDifficultySubmit('Hard')} className="bg-orange-500 hover:bg-orange-700 text-white font-bold py-2 px-4 rounded">Hard</button>
            <button onClick={() => handleDifficultySubmit('Medium')} className="bg-yellow-500 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded">Medium</button>
            <button onClick={() => handleDifficultySubmit('Easy')} className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded">Easy</button>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <h3 className="text-xl font-bold text-blue-600">AI Analysis</h3>
          <div className="mt-2 p-4 bg-gray-100 rounded-lg whitespace-pre-wrap">
            {currentMistake.analysis_text || "Generating analysis..."}
          </div>
          <button onClick={handleNext} className="mt-4 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full text-lg">
            Next Question &rarr;
          </button>
        </div>
      )}
    </div>
  );
};

export default PracticeView;