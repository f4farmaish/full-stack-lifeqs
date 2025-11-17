// src/components/PointsEarned.tsx
import React from 'react';

interface Section {
    reason: string;
    points: number;
}

interface PointsEarnedProps {
    sections: Section[];
}

const PointsEarned: React.FC<PointsEarnedProps> = ({ sections }) => {
    return (
        <div className="bg-white p-4 shadow rounded-lg w-full">
            <h2 className="font-bold text-lg mb-4 text-cyan-950">Points Earned</h2>
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
                    {sections.map((section, index) => (
                        <tr key={index}>
                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-cyan-950">
                                {section.reason}
                            </td>
                            <td className="px-5 py-5 border-b border-gray-200 bg-white text-sm text-cyan-950">
                                +{section.points}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PointsEarned;
