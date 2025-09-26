'use client';
import { useState, useEffect } from 'react';
import { Treemap, ResponsiveContainer } from 'recharts';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// --- TYPE DEFINITIONS ---
interface TreeNode {
  name: string;
  children?: TreeNode[];
  value?: number;
}

const COLORS = ['#8889DD', '#9597E4', '#8DC77B', '#A5D297', '#E2CF45', '#F8C12D'];

const CustomizedContent = ({ root, depth, x, y, width, height, index, colors, name }) => {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{
          fill: depth < 2 ? colors[Math.floor((index / root.children.length) * 6)] : 'none',
          stroke: '#fff',
          strokeWidth: 2 / (depth + 1e-10),
          strokeOpacity: 1 / (depth + 1e-10),
        }}
      />
      {depth === 1 ? (
        <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill="#fff" fontSize={14}>
          {name}
        </text>
      ) : null}
      {depth === 2 ? (
        <text x={x + 4} y={y + 18} fill="#fff" fontSize={12} fillOpacity={0.9}>
          {name}
        </text>
      ) : null}
    </g>
  );
};


const WeaknessTreemap = () => {
  const [data, setData] = useState<TreeNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWeaknessData = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/analytics/weakness-breakdown`);
        if (!res.ok) {
          throw new Error('Failed to fetch weakness data');
        }
        const jsonData = await res.json();
        setData(jsonData);
      } catch (err: unknown) {
        if (err instanceof Error) {
            setError(err.message);
        } else {
            setError("An unknown error occurred");
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchWeaknessData();
  }, []);

  if (isLoading) return <div className="text-center mt-8">Loading Weakness Breakdown...</div>;
  if (error) return <div className="text-center mt-8 text-red-500">Error: {error}</div>;
  if (!data || data.length === 0) {
    return <div className="text-center mt-8 text-gray-400">No mistake data available to generate a weakness breakdown.</div>;
  }

  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold mb-6">Weakness Breakdown</h2>
      <div className="w-full h-96 bg-gray-800 p-4 rounded-lg shadow-lg">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            width={400}
            height={200}
            data={data}
            dataKey="value"
            stroke="#fff"
            fill="#8884d8"
            content={<CustomizedContent colors={COLORS} />}
          />
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default WeaknessTreemap;