import React, { useState, useCallback } from 'react';
import { editImage } from '../services/geminiService';
import ImagePanel from './ImagePanel';

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

interface SwagStyle {
  name: string;
  emoji: string;
  prompt: string;
}

const swagStyles: SwagStyle[] = [
  { name: 'Deal With It', emoji: '😎', prompt: "Find the most prominent face and add 'deal with it' style pixelated sunglasses. Make it look like the meme." },
  { name: 'Thug Life', emoji: '🧢', prompt: 'Give the person in the image the "thug life" treatment: add a black flat-brimmed cap, a thick gold chain, and a cigar. Make it look like the meme.' },
  { name: 'Royal Swag', emoji: '👑', prompt: 'Add a realistic, ornate golden crown and a thick, heavy gold chain necklace to the most prominent person.' },
  { name: 'Money Eyes', emoji: '🤑', prompt: 'Replace the eyes of the person with glowing green dollar signs. Add raining money in the background.' },
  { name: 'Clown Face', emoji: '🤡', prompt: 'Apply classic clown makeup to the face: white face paint, a big red nose, and a drawn-on smile.' },
  { name: 'Cyborg', emoji: '🤖', prompt: 'Transform one half of the face into a futuristic cyborg, with glowing red optics and exposed metallic parts.' },
];


const FaceSwapper: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<FileData | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeStyle, setActiveStyle] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setOriginalFile({
            base64: base64String.split(',')[1],
            mimeType: file.type
        });
        setEditedImage(null);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async (style: SwagStyle) => {
    if (!originalFile) {
      setError('Please upload an image first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setActiveStyle(style.name);

    try {
      const result = await editImage(originalFile.base64, originalFile.mimeType, style.prompt);
      setEditedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
      setActiveStyle(null);
    }
  }, [originalFile]);

  const handleClear = () => {
    setOriginalFile(null);
    setEditedImage(null);
    setError(null);
    setActiveStyle(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
      <ClearProjectButton onClick={handleClear} />
      <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4">
        <ImagePanel
          title="Original"
          imageDataUrl={originalFile ? `data:${originalFile.mimeType};base64,${originalFile.base64}` : null}
          onFileChange={handleFileChange}
        />
        <ImagePanel
          title="Swagged"
          imageDataUrl={editedImage}
          isLoading={isLoading}
        />
      </div>
       {error && (
        <div className="my-2 p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
          {error}
        </div>
      )}
      <div className="sticky bottom-0 left-0 right-0 w-full bg-gray-800/80 backdrop-blur-lg border-t border-gray-700 p-4 rounded-t-lg">
        <div className="max-w-5xl mx-auto">
            <h3 className="text-lg font-semibold text-center mb-4 text-gray-300">Choose a Swag Style</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {swagStyles.map(style => (
                    <button
                        key={style.name}
                        onClick={() => handleSubmit(style)}
                        disabled={isLoading || !originalFile}
                        className="flex flex-col items-center justify-center gap-2 p-3 font-semibold text-white bg-gray-700 rounded-lg shadow-md hover:bg-gray-600 border-b-4 border-gray-800 active:border-b-2 active:translate-y-0.5 transform transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading && activeStyle === style.name ? (
                            <svg className="animate-spin h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                           <span className="text-3xl">{style.emoji}</span>
                        )}
                        <span className="text-sm">{style.name}</span>
                    </button>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FaceSwapper;