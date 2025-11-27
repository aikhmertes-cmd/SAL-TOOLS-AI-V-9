import React, { useState } from 'react';

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const ClearIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
);


interface ControlPanelProps {
  prompt: string;
  setPrompt: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isReadyToSubmit: boolean;
  isEditedImageAvailable: boolean;
  onDownload: () => void;
  onGeneratePrompt: () => void;
  placeholder?: string;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ prompt, setPrompt, onSubmit, isLoading, isReadyToSubmit, isEditedImageAvailable, onDownload, onGeneratePrompt, placeholder }) => {
  const isDisabled = isLoading || !isReadyToSubmit;
  const [isCopied, setIsCopied] = useState(false);

  const handleCopy = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="sticky bottom-0 left-0 right-0 w-full bg-gray-800/80 backdrop-blur-lg border-t border-gray-700 p-4 rounded-t-lg">
      <div className="flex flex-col sm:flex-row items-center gap-4 max-w-5xl mx-auto">
        <div className="relative w-full flex-grow">
            <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={placeholder || "Enter an editing prompt, e.g., 'Add a retro filter'"}
            className="w-full bg-gray-700 text-gray-200 placeholder-gray-400 border border-gray-600 rounded-md py-3 pl-4 pr-28 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200"
            disabled={isDisabled}
            onKeyDown={(e) => e.key === 'Enter' && !isDisabled && onSubmit()}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-2 space-x-1">
                <button title="Suggest Prompt" onClick={onGeneratePrompt} disabled={isDisabled} className="p-1 rounded-full text-gray-400 hover:text-white disabled:hover:text-gray-400 disabled:opacity-50 transition">
                    <SparklesIcon />
                </button>
                <button title="Copy Prompt" onClick={handleCopy} disabled={!prompt || isDisabled} className="p-1 rounded-full text-gray-400 hover:text-white disabled:hover:text-gray-400 disabled:opacity-50 transition">
                    {isCopied ? <span className="text-xs text-cyan-400 font-semibold px-1">Copied!</span> : <CopyIcon />}
                </button>
                <button title="Clear Prompt" onClick={() => setPrompt('')} disabled={!prompt || isDisabled} className="p-1 rounded-full text-gray-400 hover:text-white disabled:hover:text-gray-400 disabled:opacity-50 transition">
                    <ClearIcon />
                </button>
            </div>
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2">
            <button
                onClick={onDownload}
                disabled={!isEditedImageAvailable || isLoading}
                className="w-full sm:w-auto flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg shadow-lg hover:bg-gray-500 border-b-4 border-gray-800 active:border-b-2 active:translate-y-0.5 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                <span className="text-xl mr-2">💾</span>
                Download
            </button>
            <button
                onClick={onSubmit}
                disabled={isDisabled}
                className="w-full sm:w-auto flex items-center justify-center px-6 py-2 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
                >
                {isLoading ? (
                    <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                    </>
                ) : (
                    <>
                        <span className="text-xl mr-2">🚀</span>
                        Generate
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;