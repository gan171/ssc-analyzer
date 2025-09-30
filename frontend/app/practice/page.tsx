"use client";

import { useState } from 'react';
import PracticeView from '@/components/PracticeView';

const PracticePage = () => {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const sections = ['Reasoning', 'Maths', 'English', 'General Awareness'];

  if (selectedSection) {
    return <PracticeView sectionName={selectedSection} onBack={() => setSelectedSection(null)} />;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Practice Mode</h1>
      <h2 className="text-xl mb-4">Choose a section to start practicing your mistakes:</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sections.map((section) => (
          <button
            key={section}
            onClick={() => setSelectedSection(section)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg"
          >
            {section}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PracticePage;