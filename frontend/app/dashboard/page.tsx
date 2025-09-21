'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';


type TopicSummary = {
  topic: string;
  count: number;
};

type PerformancePoint = {
    date: string;
    overall_score: number;
    percentile: number;
};

type SectionalSummary = {
    section: string;
    average_score: number;
    average_accuracy: number;
    average_time_spent: number;
};


export default function DashboardPage() {
  const [summary, setSummary] = useState<TopicSummary[]>([]);
  const [performance, setPerformance] = useState<PerformancePoint[]>([]);
  const [sectional, setSectional] = useState<SectionalSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const [summaryRes, performanceRes, sectionalRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/topic-summary`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/performance-trajectory`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/analytics/sectional-deep-dive`)
        ]);
        const summaryData = await summaryRes.json();
        const performanceData = await performanceRes.json();
        const sectionalData = await sectionalRes.json();

        setSummary(summaryData);
        setPerformance(performanceData);
        setSectional(sectionalData);

      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="text-center p-24">Loading Analytics...</div>;

  return (
    <main className="flex min-h-screen flex-col items-center p-12 md:p-24">
      <div className="w-full max-w-6xl">
        <Link href="/" className="text-blue-400 hover:underline mb-8 block">&larr; Back to Mocks</Link>
        <h1 className="text-4xl font-bold text-center mb-8">Analytics Dashboard</h1>

        {/* Performance Trajectory */}
        <div className="bg-gray-800 p-6 rounded-lg mb-8">
            <h2 className="text-2xl font-semibold mb-4">Performance Trajectory</h2>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line yAxisId="left" type="monotone" dataKey="overall_score" stroke="#8884d8" activeDot={{ r: 8 }} />
                    <Line yAxisId="right" type="monotone" dataKey="percentile" stroke="#82ca9d" />
                </LineChart>
            </ResponsiveContainer>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
            {/* Sectional Deep Dive */}
            <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-semibold mb-4">Sectional Deep Dive</h2>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sectional}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="section" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="average_score" fill="#8884d8" />
                        <Bar dataKey="average_accuracy" fill="#82ca9d" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
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

      </div>
    </main>
  );
}