import React from 'react';
import type { Style } from './styles.ts';

interface StyleSelectorProps {
  styles: Style[];
  onSelectStyle: (styleValue: string) => void;
  isLoading: boolean;
}

const StyleSelector: React.FC<StyleSelectorProps> = ({ styles, onSelectStyle, isLoading }) => {
  return (
    <div className="w-full max-w-5xl mx-auto mb-6">
      <h2 className="text-lg font-semibold text-center mb-4 text-gray-300">✨ Choose a Style (Optional)</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {styles.map((style) => (
          <button
            key={style.name}
            onClick={() => onSelectStyle(style.value)}
            disabled={isLoading}
            className="group relative rounded-lg overflow-hidden border-2 border-gray-700/50 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:border-gray-700/50"
            aria-label={`Select ${style.name} style`}
          >
            <img src={style.imageUrl} alt={style.name} className="w-full h-20 sm:h-24 object-cover transition-transform duration-300 group-hover:scale-110" loading="lazy" />
            <div className="absolute inset-0 bg-black/60 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center p-1">
              <span className="text-white font-semibold text-center text-sm">{style.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StyleSelector;