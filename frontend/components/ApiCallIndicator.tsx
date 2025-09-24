'use client';
import { useState, useEffect } from 'react';

const ApiCallIndicator = () => {
    const [callCount, setCallCount] = useState<number | null>(null);

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/analytics/today-api-calls`);
                if (res.ok) {
                    const data = await res.json();
                    setCallCount(data.count);
                }
            } catch (error) {
                console.error("Failed to fetch API call count", error);
            }
        };

        fetchCount();
        // Optional: Refresh the count periodically
        const interval = setInterval(fetchCount, 60000); // every 60 seconds
        return () => clearInterval(interval);
    }, []);

    if (callCount === null) {
        return null; // Or a loading spinner
    }

    return (
        <div className="text-sm text-gray-400">
            <span>Today's API Calls: </span>
            <span className="font-bold text-white">{callCount}</span>
        </div>
    );
};

export default ApiCallIndicator;