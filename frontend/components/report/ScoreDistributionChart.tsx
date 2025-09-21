'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

interface ChartProps {
  data: { name: string; count: number }[];
}

const ScoreDistributionChart = ({ data }: ChartProps) => {
  return (
    <div className="w-full h-80 bg-gray-800 p-4 rounded-lg shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Score Distribution</h3>
        <ResponsiveContainer>
            <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#4A5568" />
                <XAxis dataKey="name" stroke="#A0AEC0" />
                <YAxis stroke="#A0AEC0" />
                <Tooltip
                    contentStyle={{
                        backgroundColor: '#2D3748',
                        borderColor: '#4A5568',
                        color: '#E2E8F0'
                    }}
                />
                <Bar dataKey="count" fill="#6366F1" />
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};

export default ScoreDistributionChart;