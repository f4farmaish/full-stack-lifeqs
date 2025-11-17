// src/components/XperPointsCircle.tsx
import React, { useEffect, useState } from 'react';

interface XperPointsCircleProps {
    level: number;
    levelName: string;
    currentPoints: number;
    maxPoints: number;
}

const XperPointsCircle: React.FC<XperPointsCircleProps> = ({ 
    level, 
    currentPoints, 
    levelName, 
    maxPoints 
}) => {
    const [animatedPoints, setAnimatedPoints] = useState(0);
    const [animatedPercentage, setAnimatedPercentage] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    
    const percentage = (currentPoints / maxPoints) * 100;
    const radius = 80;
    const circumference = 2 * Math.PI * radius;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 200);
        
        // Animate points counter
        const pointsDuration = 2000;
        const pointsSteps = 80;
        const pointsIncrement = currentPoints / pointsSteps;
        let currentPointsValue = 0;
        
        const pointsTimer = setInterval(() => {
            currentPointsValue += pointsIncrement;
            if (currentPointsValue >= currentPoints) {
                currentPointsValue = currentPoints;
                clearInterval(pointsTimer);
            }
            setAnimatedPoints(Math.floor(currentPointsValue));
        }, pointsDuration / pointsSteps);

        // Animate percentage
        const percentageDuration = 2500;
        const percentageSteps = 100;
        const percentageIncrement = percentage / percentageSteps;
        let currentPercentageValue = 0;
        
        const percentageTimer = setInterval(() => {
            currentPercentageValue += percentageIncrement;
            if (currentPercentageValue >= percentage) {
                currentPercentageValue = percentage;
                clearInterval(percentageTimer);
            }
            setAnimatedPercentage(currentPercentageValue);
        }, percentageDuration / percentageSteps);

        return () => {
            clearTimeout(timer);
            clearInterval(pointsTimer);
            clearInterval(percentageTimer);
        };
    }, [currentPoints, percentage]);

    return (
        <div className="relative flex justify-center items-center w-72 h-72 group">
            {/* Outer rotating ring */}
            <div className="absolute inset-0 rounded-full border-2 border-primary-500/20 animate-spin" style={{ animationDuration: '8s' }}></div>
            
            {/* Middle rotating ring */}
            <div className="absolute inset-6 rounded-full border border-primary-600/30 animate-spin" style={{ animationDuration: '12s', animationDirection: 'reverse' }}></div>
            
            {/* Glowing background */}
            <div className="absolute inset-8 rounded-full bg-gradient-to-br from-primary-500/20 to-primary-600/30 animate-pulse blur-sm"></div>
            
            {/* Main container */}
            <div className="absolute inset-12 rounded-full bg-gradient-to-br from-dark-2 to-dark-3 border border-primary-500/30 shadow-2xl overflow-hidden">
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-transparent to-primary-600/10 animate-spin" style={{ animationDuration: '6s' }}></div>
            </div>
            
            {/* Main SVG Circle */}
            <svg 
                className={`absolute inset-16 w-50 h-50 transform -rotate-90 transition-all duration-1000 ${
                    isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                }`} 
                viewBox="0 0 180 180"
            >
                <defs>
                    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#877EFF" />
                        <stop offset="50%" stopColor="#5D5FEF" />
                        <stop offset="100%" stopColor="#877EFF" />
                    </linearGradient>
                    <filter id="glow">
                        <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                        <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                        </feMerge>
                    </filter>
                </defs>
                
                {/* Background track */}
                <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="#1F1F22"
                    strokeWidth="8"
                />
                
                {/* Progress circle */}
                <circle
                    cx="90"
                    cy="90"
                    r={radius}
                    fill="none"
                    stroke="url(#progressGradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    filter="url(#glow)"
                    className="transition-all duration-1000 ease-out"
                />
                
                {/* Animated progress indicator */}
                {animatedPercentage > 0 && (
                    <circle
                        cx={90 + radius * Math.cos((animatedPercentage / 100) * 2 * Math.PI - Math.PI / 2)}
                        cy={90 + radius * Math.sin((animatedPercentage / 100) * 2 * Math.PI - Math.PI / 2)}
                        r="6"
                        fill="url(#progressGradient)"
                        className="animate-pulse"
                        filter="url(#glow)"
                    />
                )}
            </svg>
            
            {/* Center content */}
            <div className={`z-10 flex flex-col items-center transition-all duration-1000 delay-500 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}>
                {/* Level number */}
                <div className="relative mb-3 group-hover:scale-110 transition-transform duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl blur-lg opacity-60 animate-pulse"></div>
                    <div className="relative text-6xl font-black text-light-1 px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 rounded-2xl shadow-lg">
                        {level}
                    </div>
                </div>
                
                {/* Level name */}
                <div className="text-light-2 text-sm font-semibold mb-4 tracking-wider uppercase opacity-90">
                    {levelName}
                </div>
                
                {/* Points display */}
                <div className="text-center mb-2">
                    <div className="text-2xl font-bold text-light-1 mb-1 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                        {animatedPoints.toLocaleString()}
                    </div>
                    <div className="text-light-3 text-sm">
                        of {maxPoints.toLocaleString()} Points
                    </div>
                </div>
                
                {/* Percentage indicator */}
                <div className="px-4 py-2 bg-gradient-to-r from-primary-500/20 to-primary-600/20 rounded-full border border-primary-500/30 backdrop-blur-sm">
                    <span className="text-light-1 text-sm font-bold">
                        {animatedPercentage.toFixed(1)}%
                    </span>
                </div>
            </div>
            
            {/* Floating particles */}
            <div className="absolute inset-0 pointer-events-none">
                {[...Array(8)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-primary-500/60 rounded-full"
                        style={{
                            left: `${15 + i * 8}%`,
                            top: `${10 + (i % 3) * 30}%`,
                            animation: `ping ${2 + i * 0.3}s infinite`,
                            animationDelay: `${i * 0.4}s`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default XperPointsCircle;