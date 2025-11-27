import React, { useState, useCallback } from 'react';
import { generateVideoPromptFromImage } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';
import PromptPanel from './PromptPanel.tsx';

interface FileData {
  base64: string;
  mimeType: string;
}

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button
            onClick={onClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200"
            aria-label="Clear current project"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const ImageToVideoPrompt: React.FC = () => {
  const [sourceFile, setSourceFile] = useState<FileData | null>(null);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSourceFile({
            base64: base64String.split(',')[1],
            mimeType: file.type
        });
        setGeneratedPrompt(null);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!sourceFile) {
      setError('Please upload an image to generate a video prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedPrompt(null);

    try {
      const result = await generateVideoPromptFromImage(sourceFile.base64, sourceFile.mimeType);
      setGeneratedPrompt(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [sourceFile]);
  
  const handleClear = () => {
    setSourceFile(null);
    setGeneratedPrompt(null);
    setError(null);
  };

  const isDisabled = isLoading || !sourceFile;

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
      <ClearProjectButton onClick={handleClear} />
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4">
        <ImagePanel
          title="Source Image"
          imageDataUrl={sourceFile ? `data:${sourceFile.mimeType};base64,${sourceFile.base64}` : null}
          onFileChange={handleFileChange}
        />
        <PromptPanel
          title="Generated Video Prompt"
          promptText={generatedPrompt}
          isLoading={isLoading}
        />
      </div>
       {error && (
        <div className="my-2 p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
          {error}
        </div>
      )}
       <div className="sticky bottom-0 left-0 right-0 w-full bg-gray-800/80 backdrop-blur-lg border-t border-gray-700 p-4 rounded-t-lg">
            <div className="flex justify-center max-w-5xl mx-auto">
                <button
                    onClick={handleSubmit}
                    disabled={isDisabled}
                    className="w-full sm:w-auto flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-600 disabled:to-gray-700"
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
                            <span className="text-xl mr-2">🎬</span>
                            Generate Video Prompt
                        </>
                    )}
                </button>
            </div>
       </div>
    </div>
  );
};

export default ImageToVideoPrompt;