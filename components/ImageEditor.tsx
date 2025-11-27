import React, { useState, useCallback } from 'react';
import { editImage } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';
import ControlPanel from './ControlPanel.tsx';

interface FileData {
  base64: string;
  mimeType: string;
}

const samplePrompts = [
    'Add a retro, vintage filter.',
    'Turn the photo into a watercolor painting.',
    'Make the sky look like a galaxy.',
    'Add a small, cute robot waving.',
    'Change the season to winter, add snow.',
    'Apply a neon cyberpunk aesthetic.',
    'Make it look like an old, faded photograph.',
    'Convert to a black and white sketch.',
    'Add magical glowing butterflies.',
    'Place a futuristic city in the background.'
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

const ImageEditor: React.FC = () => {
  const [originalFile, setOriginalFile] = useState<FileData | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setOriginalFile({
            base64: base64String.split(',')[1], // remove the data URL prefix
            mimeType: file.type
        });
        setEditedImage(null);
        setError(null);
      };
      reader.onerror = () => {
        setError('Failed to read the image file.');
      };
      // FIX: Corrected method name from readDataURL to readAsDataURL.
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!originalFile || !prompt.trim()) {
      setError('Please upload an image and enter a prompt.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setEditedImage(null);

    try {
      const result = await editImage(originalFile.base64, originalFile.mimeType, prompt);
      setEditedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [originalFile, prompt]);

  const handleGeneratePrompt = () => {
    const randomPrompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    setPrompt(randomPrompt);
  };

  const handleDownload = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    // Extract extension from mime type
    const mimeType = editedImage.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `edited-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    setOriginalFile(null);
    setEditedImage(null);
    setPrompt('');
    setError(null);
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
          title="Edited"
          imageDataUrl={editedImage}
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
        isReadyToSubmit={!!originalFile}
        placeholder="Enter an editing prompt, e.g., 'Add a retro filter'"
        isEditedImageAvailable={!!editedImage}
        onDownload={handleDownload}
        onGeneratePrompt={handleGeneratePrompt}
      />
    </div>
  );
};

export default ImageEditor;