// src/components/LostPoints.tsx
import React from 'react';

interface LostPointsProps {
    pointsData: { reason: string; points: number }[];
}

const LostPoints: React.FC<LostPointsProps> = ({ pointsData }) => {
    return (
        <div className="bg-white p-4 shadow rounded-lg w-full">
            <h2 className="font-bold text-lg mb-4 text-cyan-950">Lost points </h2>
            <table className="min-w-full leading-normal">
                <thead>
                    <tr>
                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Reason
                        </th>
                        <th className="px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                            Points
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {pointsData.map((item, index) => (
                        <tr key={index}>
                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-cyan-950">
                                {item.reason}
                            </td>
                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-cyan-950">
                                {item.points}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default LostPoints;
