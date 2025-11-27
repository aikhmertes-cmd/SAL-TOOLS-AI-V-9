import React, { useState, useEffect } from 'react';

const bgGradients = [
  'linear-gradient(135deg, #1f2937, #111827)', // Default Dark
  'linear-gradient(135deg, #5b21b6, #1e3a8a)', // Purple -> Blue
  'linear-gradient(135deg, #047857, #15803d)', // Green -> Darker Green
  'linear-gradient(135deg, #9f1239, #7f1d1d)', // Rose -> Red
  'linear-gradient(135deg, #155e75, #164e63)', // Cyan -> Darker Cyan
  'linear-gradient(135deg, #7e22ce, #581c87)', // Fuchsia -> Darker Fuchsia
];


const WorkTimer: React.FC = () => {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isColorChangeActive, setIsColorChangeActive] = useState(true);
  const [countdown, setCountdown] = useState(9);
  const [colorIndex, setColorIndex] = useState(0);

  useEffect(() => {
    const workTimerInterval = setInterval(() => {
      setElapsedSeconds(prevSeconds => prevSeconds + 1);
    }, 1000);

    let colorChangeInterval: number | undefined;
    if (isColorChangeActive) {
      colorChangeInterval = window.setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setColorIndex(current => (current + 1) % bgGradients.length);
            return 9; // Reset countdown
          }
          return prev - 1;
        });
      }, 1000);
    } else {
        // When inactive, reset countdown for the next start and reset color to default
        setCountdown(9);
        setColorIndex(0);
    }

    return () => {
        clearInterval(workTimerInterval);
        if (colorChangeInterval) clearInterval(colorChangeInterval);
    };
  }, [isColorChangeActive]);

  const formatTime = (totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  };

  return (
    <div 
      className="flex items-center justify-between gap-4 border border-gray-700 rounded-lg px-4 py-2 transition-all duration-1000"
      style={{ background: bgGradients[colorIndex] }}
    >
      {/* Work Timer Display */}
      <div className="flex items-center gap-3">
        <span className="text-3xl animate-pulse">🕰️</span>
        <div>
          <span className="text-xs text-gray-400">Work Time</span>
          <div 
            className="text-2xl font-mono font-bold text-cyan-300"
            style={{
              textShadow: `
                0 0 5px rgba(0, 255, 255, 0.5),
                0 0 10px rgba(0, 255, 255, 0.4),
                0 0 15px rgba(127, 0, 255, 0.3),
                0 0 20px rgba(127, 0, 255, 0.2)
              `,
            }}
          >
            {formatTime(elapsedSeconds)}
          </div>
        </div>
      </div>
      
      {/* Color Change Controls */}
      <div className="text-center w-28">
          <button 
            onClick={() => setIsColorChangeActive(prev => !prev)}
            className="px-3 py-1 text-xs font-semibold bg-black/20 hover:bg-black/40 rounded-md transition-colors text-gray-300 border border-gray-600"
            aria-label={isColorChangeActive ? 'Stop background color change' : 'Start background color change'}
          >
            {isColorChangeActive ? 'Stop Change' : 'Start Change'}
          </button>
          {isColorChangeActive && (
            <p className="text-xs text-gray-400 mt-1 animate-pulse">
              Change in: <span className="font-bold text-cyan-300">{countdown}s</span>
            </p>
          )}
      </div>
    </div>
  );
};

export default WorkTimer;
