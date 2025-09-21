'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import React from 'react';

// --- TYPE DEFINITIONS ---
interface SectionData {
  attempts: { right: number; wrong: number; left: number };
  marks: { positive: number; negative: number; net: number };
}

interface FullMockLog {
  id: number;
  date: string;
  name: string;
  total_score: number;
  percentile: number;
  is_analyzed: boolean;
  sections: {
    maths?: SectionData;
    reasoning?: SectionData;
    english?: SectionData;
    gk?: SectionData;
  };
  totals: {
    attempts: { right: number; wrong: number; left: number };
    marks: { positive: number; negative: number; net: number };
  };
}

interface ReportCardData {
    score_brackets: Record<string, number>;
    percentile_brackets: Record<string, number>;
    last_3_mocks: any[];
    last_5_mocks: any[];
    last_10_mocks: any[];
    sectional_averages: Record<string, number>;
    overall_avg_score: number;
    total_mocks: number;
}

interface PerformanceData {
  full_mock_log: FullMockLog[];
  report_card: ReportCardData;
}


// --- ReportCard COMPONENT ---
// Moved from the separate file to here for simplicity
const StatBox = ({ title, value, colorClass = 'text-indigo-400' }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg text-center">
        <p className="text-sm text-gray-400">{title}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
    </div>
);

const MocksTable = ({ title, mocks }) => (
    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="font-bold text-white mb-2">{title}</h3>
        <table className="w-full text-xs text-left">
            <thead>
                <tr className="text-gray-400">
                    <th className="py-1">Name</th>
                    <th className="py-1 text-center">Total</th>
                    <th className="py-1 text-center">M</th>
                    <th className="py-1 text-center">R</th>
                    <th className="py-1 text-center">E</th>
                    <th className="py-1 text-center">G</th>
                </tr>
            </thead>
            <tbody>
                {mocks.map((mock, index) => (
                    <tr key={index} className="border-t border-gray-700">
                        <td className="py-1 pr-2 truncate" title={mock.name}>{mock.name}</td>
                        <td className="py-1 text-center font-semibold text-green-400">{mock.total}</td>
                        <td className="py-1 text-center">{mock.maths}</td>
                        <td className="py-1 text-center">{mock.reasoning}</td>
                        <td className="py-1 text-center">{mock.english}</td>
                        <td className="py-1 text-center">{mock.gk}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const ReportCard = ({ data }) => {
    if (!data || !data.total_mocks) return null;

    return (
        <div className="mb-12">
            <h2 className="text-3xl font-bold mb-6">Report Card</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1: Averages & Score Brackets */}
                <div className="space-y-6">
                    <StatBox title="Overall Average Score" value={data.overall_avg_score} colorClass="text-green-400" />
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h3 className="font-bold text-white mb-2">Sectional Averages</h3>
                        <div className="grid grid-cols-2 gap-2 text-center text-sm">
                            <p>Maths: <span className="font-semibold">{data.sectional_averages.maths}</span></p>
                            <p>Reasoning: <span className="font-semibold">{data.sectional_averages.reasoning}</span></p>
                            <p>English: <span className="font-semibold">{data.sectional_averages.english}</span></p>
                            <p>GK: <span className="font-semibold">{data.sectional_averages.gk}</span></p>
                        </div>
                    </div>
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h3 className="font-bold text-white mb-2">Score Brackets</h3>
                        <div className="grid grid-cols-2 gap-2 text-center text-sm">
                            {Object.entries(data.score_brackets).map(([key, value]) => (
                                <p key={key}>{key}: <span className="font-semibold">{value}</span></p>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Column 2: Last Mocks */}
                <div className="space-y-6">
                    <MocksTable title="Last 3 Mocks" mocks={data.last_3_mocks} />
                    <MocksTable title="Last 5 Mocks" mocks={data.last_5_mocks} />
                </div>

                {/* Column 3: More Last Mocks & Percentile */}
                <div className="space-y-6">
                    <MocksTable title="Last 10 Mocks" mocks={data.last_10_mocks} />
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                        <h3 className="font-bold text-white mb-2">Percentile Brackets</h3>
                        <div className="grid grid-cols-2 gap-2 text-center text-sm">
                            {Object.entries(data.percentile_brackets).map(([key, value]) => (
                                <p key={key}>{key}%: <span className="font-semibold">{value}</span></p>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};


// --- MAIN PAGE COMPONENT ---
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const PerformanceReportPage = () => {
  const [reportData, setReportData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/performance-report`);
        if (!res.ok) throw new Error('Failed to fetch performance data');
        const data = await res.json();
        setReportData(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReportData();
  }, []);

  const handleToggleAnalysis = async (mockId: number) => {
    setReportData(prevData => {
        if (!prevData) return null;
        return {
            ...prevData,
            full_mock_log: prevData.full_mock_log.map(m => 
                m.id === mockId ? { ...m, is_analyzed: !m.is_analyzed } : m
            ),
        };
    });
    try {
        await fetch(`${API_BASE_URL}/mocks/${mockId}/toggle-analysis-status`, { method: 'PATCH' });
    } catch (err) {
        console.error("Failed to update analysis status:", err);
        alert("Could not update status. Please try again.");
    }
  };

  if (isLoading) return <div className="text-center mt-12">Loading Performance Report...</div>;
  if (error) return <div className="text-center mt-12 text-red-500">Error: {error}</div>;
  if (!reportData || !reportData.report_card || reportData.report_card.total_mocks === 0) {
    return <div className="text-center mt-12 text-gray-400">No mock data available to generate a report.</div>;
  }
  
  const sectionOrder: (keyof FullMockLog['sections'])[] = ['maths', 'reasoning', 'english', 'gk'];

  return (
    <div className="container mx-auto p-4 md:p-8 text-white">
      <h1 className="text-4xl font-bold mb-8">Performance Overview</h1>
      
      <ReportCard data={reportData.report_card} />

      <div className="w-full border-t border-gray-700 my-12"></div>

      <h2 className="text-3xl font-bold mb-6">Full Mock Test Log</h2>
      <div className="bg-gray-800 shadow-lg rounded-lg overflow-x-auto">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-700 uppercase text-xs text-gray-300">
            <tr>
              <th rowSpan={2} className="p-3 border-r border-gray-600">Sr.No.</th>
              <th rowSpan={2} className="p-3 border-r border-gray-600">Date</th>
              <th rowSpan={2} className="p-3 border-r border-gray-600 w-1/4">Test Name</th>
              <th rowSpan={2} className="p-3 border-r border-gray-600">Analysis</th>
              <th rowSpan={2} className="p-3 border-r border-gray-600">Marks</th>
              <th rowSpan={2} className="p-3 border-r border-gray-600">Percentile</th>
              <th colSpan={15} className="p-3 text-center border-b border-r border-gray-600">Questions Attempt Analysis</th>
              <th colSpan={15} className="p-3 text-center border-b border-gray-600">Marks Analysis</th>
            </tr>
            <tr>
              {sectionOrder.map(sec => (<th className="p-2 text-center border-r border-gray-600" colSpan={3} key={`${sec}-attempt`}>{sec}</th>))}
              <th className="p-2 text-center border-r border-gray-600" colSpan={3}>Total</th>
              {sectionOrder.map(sec => (<th className="p-2 text-center border-r border-gray-600" colSpan={3} key={`${sec}-marks`}>{sec}</th>))}
              <th className="p-2 text-center" colSpan={3}>Total</th>
            </tr>
            <tr className='bg-gray-600'>
                <th colSpan={6} className='border-r border-gray-500'></th>
                {[...sectionOrder, 'totals'].map((_, i) => (<React.Fragment key={`attempt-sub-${i}`}><th className='p-1 text-center font-normal text-green-400'>R</th><th className='p-1 text-center font-normal text-red-400'>W</th><th className='p-1 text-center font-normal border-r border-gray-500'>L</th></React.Fragment>))}
                 {[...sectionOrder, 'totals'].map((_, i) => (<React.Fragment key={`marks-sub-${i}`}><th className='p-1 text-center font-normal text-green-400'>+ve</th><th className='p-1 text-center font-normal text-red-400'>-ve</th><th className='p-1 text-center font-normal border-r border-gray-500'>Net</th></React.Fragment>))}
            </tr>
          </thead>
          <tbody>
            {reportData.full_mock_log.map((mock, index) => (
              <tr key={mock.id} className="border-b border-gray-700 hover:bg-gray-700/50 text-center">
                <td className="p-3 border-r border-gray-600">{index + 1}</td>
                <td className="p-3 border-r border-gray-600">{mock.date}</td>
                <td className="p-3 border-r border-gray-600 text-left"><Link href={`/mock/${mock.id}`} className="hover:text-indigo-400 transition-colors">{mock.name}</Link></td>
                <td className="p-3 border-r border-gray-600"><input type="checkbox" checked={mock.is_analyzed} onChange={() => handleToggleAnalysis(mock.id)} className="w-5 h-5 cursor-pointer accent-indigo-500"/></td>
                <td className="p-3 border-r border-gray-600 font-bold text-green-400">{mock.total_score}</td>
                <td className="p-3 border-r border-gray-600 font-semibold text-blue-400">{mock.percentile ? mock.percentile.toFixed(2) : 'N/A'}%</td>
                {sectionOrder.map(sec => (<React.Fragment key={`${mock.id}-${sec}-attempts`}><td className='p-2'>{mock.sections[sec]?.attempts.right ?? '-'}</td><td className='p-2'>{mock.sections[sec]?.attempts.wrong ?? '-'}</td><td className='p-2 border-r border-gray-600'>{mock.sections[sec]?.attempts.left ?? '-'}</td></React.Fragment>))}
                <td className='p-2'>{mock.totals.attempts.right}</td><td className='p-2'>{mock.totals.attempts.wrong}</td><td className='p-2 border-r border-gray-600'>{mock.totals.attempts.left}</td>
                {sectionOrder.map(sec => (<React.Fragment key={`${mock.id}-${sec}-marks`}><td className='p-2'>{mock.sections[sec]?.marks.positive ?? '-'}</td><td className='p-2'>{mock.sections[sec]?.marks.negative ?? '-'}</td><td className='p-2 border-r border-gray-600 font-semibold'>{mock.sections[sec]?.marks.net ?? '-'}</td></React.Fragment>))}
                <td className='p-2'>{mock.totals.marks.positive}</td><td className='p-2'>{mock.totals.marks.negative}</td><td className='p-2 border-r border-gray-600 font-bold'>{mock.total_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PerformanceReportPage;

