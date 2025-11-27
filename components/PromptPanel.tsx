import React, { useState } from 'react';

const TextIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
);

const Spinner: React.FC = () => (
  <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);


interface PromptPanelProps {
  title: string;
  promptText: string | null;
  isLoading?: boolean;
}

const PromptPanel: React.FC<PromptPanelProps> = ({ title, promptText, isLoading = false }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
        if (!promptText) return;
        navigator.clipboard.writeText(promptText);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 aspect-square">
      <h2 className="text-lg font-semibold text-center mb-4 text-gray-300">{title}</h2>
      <div className="flex-grow bg-gray-900 rounded-md flex items-center justify-center relative overflow-hidden p-6">
        {isLoading ? (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center">
                <Spinner />
                <p className="text-white mt-2 text-sm">Analyzing image...</p>
            </div>
        ) : promptText ? (
            <div className="w-full h-full flex flex-col">
                <div className="flex-grow overflow-y-auto pr-2 text-gray-300 leading-relaxed" style={{ scrollbarWidth: 'thin' }}>
                    <p>{promptText}</p>
                </div>
                <div className="pt-4 mt-auto">
                    <button onClick={handleCopy} className="w-full flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg shadow-lg hover:bg-gray-500 border-b-4 border-gray-800 active:border-b-2 active:translate-y-0.5 transform transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-400">
                        {isCopied ? (
                            <span className="text-cyan-400 font-semibold">Copied!</span>
                        ) : (
                           <>
                             <span className="text-xl mr-2">📋</span>
                             <span>Copy Prompt</span>
                           </>
                        )}
                    </button>
                </div>
            </div>
        ) : (
            <div className="text-center text-gray-500">
                <TextIcon />
                <p>Your generated prompt will appear here</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PromptPanel;