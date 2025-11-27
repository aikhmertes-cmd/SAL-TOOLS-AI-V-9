// FIX: Completed the ImageMixer component and added a default export to resolve the module import error.
import React, { useState, useCallback } from 'react';
import { mixImages } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';
import ControlPanel from './ControlPanel.tsx';

interface FileData {
  base64: string;
  mimeType: string;
}

const samplePrompts = [
    'Combine these two images into a surreal masterpiece.',
    'Merge the style of the first image with the subject of the second.',
    'Create a new image where the character from Image A is in the environment of Image B.',
    'Blend these images to create a futuristic fusion.',
    'What would a hybrid of these two objects look like?',
    'Imagine these two concepts combined into one image.',
];

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

const ImageMixer: React.FC = () => {
  const [fileA, setFileA] = useState<FileData | null>(null);
  const [fileB, setFileB] = useState<FileData | null>(null);
  const [mixedImage, setMixedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<FileData | null>>) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setter({
            base64: base64String.split(',')[1],
            mimeType: file.type
        });
        setMixedImage(null);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!fileA || !fileB || !prompt.trim()) {
      setError('Please upload two images and enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setMixedImage(null);

    try {
      const result = await mixImages(fileA.base64, fileA.mimeType, fileB.base64, fileB.mimeType, prompt);
      setMixedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [fileA, fileB, prompt]);

  const handleGeneratePrompt = () => {
    const randomPrompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    setPrompt(randomPrompt);
  };

  const handleDownload = () => {
    if (!mixedImage) return;
    const link = document.createElement('a');
    link.href = mixedImage;
    const mimeType = mixedImage.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `mixed-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    setFileA(null);
    setFileB(null);
    setMixedImage(null);
    setPrompt('');
    setError(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
      <ClearProjectButton onClick={handleClear} />
      <div className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 mb-4">
        <ImagePanel
          title="Image A"
          imageDataUrl={fileA ? `data:${fileA.mimeType};base64,${fileA.base64}` : null}
          onFileChange={handleFileChange(setFileA)}
        />
        <ImagePanel
          title="Image B"
          imageDataUrl={fileB ? `data:${fileB.mimeType};base64,${fileB.base64}` : null}
          onFileChange={handleFileChange(setFileB)}
        />
        <ImagePanel
          title="Mixed Result"
          imageDataUrl={mixedImage}
          isLoading={isLoading}
        />
      </div>
       {error && (
        <div className="my-2 p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
          {error}
        </div>
      )}
      <ControlPanel
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isReadyToSubmit={!!fileA && !!fileB}
        placeholder="Describe how to mix the images..."
        isEditedImageAvailable={!!mixedImage}
        onDownload={handleDownload}
        onGeneratePrompt={handleGeneratePrompt}
      />
    </div>
  );
};

export default ImageMixer;