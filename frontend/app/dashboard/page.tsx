'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type TopicSummary = {
  topic: string;
  count: number;
};

export default function DashboardPage() {
  const [summary, setSummary] = useState<TopicSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/topic-summary`);
        const data = await response.json();
        setSummary(data);
      } catch (error) {
        console.error("Failed to fetch analytics summary:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  if (loading) return <div className="text-center p-24">Loading Analytics...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24">
      <div className="w-full max-w-3xl">
        <Link href="/" className="text-blue-400 hover:underline mb-8 block">&larr; Back to Mocks</Link>
        <h1 className="text-4xl font-bold text-center mb-8">Analytics Dashboard</h1>
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-2xl font-semibold mb-4">Your Weakest Topics</h2>
          {summary.length === 0 ? (
            <p className="text-gray-400">No mistakes analyzed yet. Analyze some screenshots to see your stats!</p>
          ) : (
            <ol className="list-decimal list-inside space-y-2">
              {summary.map((item) => (
                <li key={item.topic}>
                  <span className="font-bold">{item.topic}:</span> {item.count} mistakes
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </main>
  );
}