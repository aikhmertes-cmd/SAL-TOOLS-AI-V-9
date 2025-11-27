import React, { useState, useCallback } from 'react';
import { generateImage } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';
import ControlPanel from './ControlPanel.tsx';
import StyleSelector from './StyleSelector.tsx';
import { styles } from './styles.ts';
import AspectRatioSelector, { AspectRatio } from './AspectRatioSelector.tsx';

const samplePrompts = [
    'A majestic lion wearing a crown, cinematic lighting.',
    'An astronaut riding a unicorn on the moon.',
    'A futuristic city with flying cars at sunset, synthwave style.',
    'A cozy library in a treehouse, fantasy concept art.',
    'A surreal painting of a clock melting in a desert.',
    'A photorealistic image of a cat DJing at a party.',
    'A delicious-looking burger with glowing mushrooms, digital art.',
    'A beautiful coral reef teeming with alien fish.',
    'A steampunk-inspired robot walking a dog.',
    'A serene Japanese garden in the middle of a bustling metropolis.'
];

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full max-w-5xl mx-auto flex justify-end mb-4">
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


const ImageGenerator: React.FC = () => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateImage(prompt, aspectRatio);
      setGeneratedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [prompt, aspectRatio]);

  const handleGeneratePrompt = () => {
    const randomPrompt = samplePrompts[Math.floor(Math.random() * samplePrompts.length)];
    setPrompt(randomPrompt);
  };

  const handleSelectStyle = (styleValue: string) => {
    setPrompt(prev => {
        // If the style is already present, do nothing.
        if (prev.toLowerCase().includes(styleValue.toLowerCase())) {
            return prev;
        }
        // Otherwise, append the new style.
        return prev.trim() ? `${prev.trim()}, ${styleValue}` : styleValue;
    });
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    const mimeType = generatedImage.split(';')[0].split(':')[1];
    const extension = mimeType.split('/')[1] || 'png';
    link.download = `generated-image-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClear = () => {
    setGeneratedImage(null);
    setPrompt('');
    setAspectRatio('1:1');
    setError(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
        <ClearProjectButton onClick={handleClear} />
        <StyleSelector styles={styles} onSelectStyle={handleSelectStyle} isLoading={isLoading} />
        <div className="flex-grow grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:gap-8 mb-4 items-start justify-center">
            <div className="w-full max-w-2xl mx-auto">
                 <ImagePanel
                    title="Generated Image"
                    imageDataUrl={generatedImage}
                    isLoading={isLoading}
                    />
            </div>
             <AspectRatioSelector
                selectedRatio={aspectRatio}
                onSelectRatio={setAspectRatio}
                isDisabled={isLoading}
             />
        </div>
       {error && (
        <div className="my-2 p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg max-w-5xl mx-auto w-full">
          {error}
        </div>
      )}
      <ControlPanel
        prompt={prompt}
        setPrompt={setPrompt}
        onSubmit={handleSubmit}
        isLoading={isLoading}
        isReadyToSubmit={true}
        placeholder="Describe the image you want to create..."
        isEditedImageAvailable={!!generatedImage}
        onDownload={handleDownload}
        onGeneratePrompt={handleGeneratePrompt}
      />
    </div>
  );
};

export default ImageGenerator;