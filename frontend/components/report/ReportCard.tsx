'use client';
import React from 'react';

// NOTE: You'll need to define the 'ReportCardData' type in your main page.tsx
// and pass it down as a prop.

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

export default ReportCard;