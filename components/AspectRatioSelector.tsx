import React from 'react';

export const supportedAspectRatios = [
    '1:1', 
    '16:9', 
    '9:16', 
    '4:3', 
    '3:4', 
    '21:9', 
    '2.35:1', 
    '3:2', 
    '5:4', 
    '2:1', 
    '4:5'
] as const;

export type AspectRatio = typeof supportedAspectRatios[number];

interface AspectRatioSelectorProps {
  selectedRatio: AspectRatio;
  onSelectRatio: (ratio: AspectRatio) => void;
  isDisabled: boolean;
}

const ratioDescriptions: Record<AspectRatio, string> = {
    '16:9': 'Widescreen – standard for video',
    '4:3': 'Traditional TV / classic videos',
    '21:9': 'Ultra-wide cinematic',
    '9:16': 'Vertical video for TikTok/Reels/Shorts',
    '1:1': 'Square – Instagram posts',
    '2.35:1': 'CinemaScope – cinematic movies',
    '3:2': 'Photography format',
    '5:4': 'Portrait or print format',
    '2:1': 'Modern cinematic look',
    '4:5': 'Instagram portrait posts',
    '3:4': 'Standard Portrait'
};

const RatioIcon: React.FC<{ ratio: AspectRatio }> = ({ ratio }) => {
  const baseClasses = "fill-current w-6 h-6";
  const getRectProps = () => {
    switch (ratio) {
      case '1:1': return { x: 5, y: 5, width: 14, height: 14, rx: 1 };
      case '16:9': return { x: 3, y: 7, width: 18, height: 10, rx: 1 };
      case '9:16': return { x: 7, y: 3, width: 10, height: 18, rx: 1 };
      case '4:3': return { x: 4, y: 6, width: 16, height: 12, rx: 1 };
      case '3:4': return { x: 6, y: 4, width: 12, height: 16, rx: 1 };
      case '21:9': return { x: 2, y: 8, width: 20, height: 8, rx: 1 };
      case '2.35:1': return { x: 1.5, y: 8.5, width: 21, height: 7, rx: 1 };
      case '3:2': return { x: 3, y: 6, width: 18, height: 12, rx: 1 };
      case '5:4': return { x: 4.5, y: 6, width: 15, height: 12, rx: 1 };
      case '2:1': return { x: 3, y: 7.5, width: 18, height: 9, rx: 1 };
      case '4:5': return { x: 6, y: 4.5, width: 12, height: 15, rx: 1 };
      default: return { x: 5, y: 5, width: 14, height: 14, rx: 1 };
    }
  };

  return (
    <svg viewBox="0 0 24 24" className={baseClasses}>
      <rect {...getRectProps()} />
    </svg>
  );
};


const CheckIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2 text-emerald-400 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
);


const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ selectedRatio, onSelectRatio, isDisabled }) => {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2 flex flex-col items-center border border-gray-700 space-y-1 self-center md:self-start max-h-[500px] overflow-y-auto custom-scrollbar">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.1);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
        }
      `}</style>
      {supportedAspectRatios.map((ratio) => {
        const isSelected = selectedRatio === ratio;
        const buttonClasses = `
          w-full flex items-center justify-between p-2 rounded-md transition-all duration-200 group relative
          disabled:opacity-50 disabled:cursor-not-allowed min-w-[100px]
          ${isSelected 
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/50' 
            : 'text-gray-400 hover:bg-gray-700 hover:text-white border border-transparent'
          }
        `;
        return (
          <button
            key={ratio}
            onClick={() => onSelectRatio(ratio)}
            disabled={isDisabled}
            className={buttonClasses}
            aria-pressed={isSelected}
            aria-label={`Aspect ratio ${ratio}: ${ratioDescriptions[ratio]}`}
            title={ratioDescriptions[ratio]}
          >
            <div className="flex items-center">
                <RatioIcon ratio={ratio} />
                <span className="font-semibold text-sm ml-2">{ratio}</span>
            </div>
            {isSelected && <CheckIcon />}
            
            {/* Tooltip on hover */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 w-48 bg-gray-900 text-xs text-gray-200 p-2 rounded shadow-xl border border-gray-700 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 hidden md:block">
                {ratioDescriptions[ratio]}
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default AspectRatioSelector;