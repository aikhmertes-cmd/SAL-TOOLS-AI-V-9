import React, { useState, useCallback, useEffect } from 'react';
import { generateVideo } from '../services/geminiService';
import VideoPanel from './VideoPanel.tsx';
import VideoOptionsSelector, { VideoAspectRatio, Resolution } from './VideoOptionsSelector.tsx';

// --- Helper Components ---

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

// --- Styles ---

interface AnimationStyle {
    name: string;
    value: string;
}

const animationStyles: AnimationStyle[] = [
    { name: 'Pixar-like', value: 'Pixar-like cinematic 3D animation' },
    { name: 'Low-Poly', value: 'Low-poly 3D animation style, simple shapes, vibrant colors' },
    { name: 'Miniature World', value: '3D, miniature toy world, tilt-shift effect' },
    { name: 'Claymation', value: 'Claymation stop-motion animation, textured, handcrafted look' },
    { name: 'Shiny Plastic', value: '3D, shiny plastic look like toy bricks, bright and colorful' },
    { name: 'Cozy Bedtime', value: '3D animation, warm and cozy lighting, soft textures, bedtime story style' },
    { name: 'Furry & Cute', value: 'Cute 3D animation, soft furry textures, big expressive eyes' },
    { name: 'Neon Glow', value: '3D animation, neon and glowing elements, dark background, sci-fi aesthetic' },
];

const StyleSelector: React.FC<{ onSelect: (styleValue: string) => void; isDisabled: boolean; }> = ({ onSelect, isDisabled }) => (
    <div className="mb-4">
        <h3 className="text-md font-semibold text-center mb-3 text-gray-300">Choose a Style</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {animationStyles.map((style) => (
                <button
                    key={style.name}
                    onClick={() => onSelect(style.value)}
                    disabled={isDisabled}
                    className="p-3 text-sm font-semibold rounded-md transition w-full bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                >
                    {style.name}
                </button>
            ))}
        </div>
    </div>
);

// --- Main Component ---

const AnimationGenerator: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
    const [resolution, setResolution] = useState<Resolution>('720p');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        return () => {
            if (videoBlobUrl) {
                URL.revokeObjectURL(videoBlobUrl);
            }
        };
    }, [videoBlobUrl]);

    const handleSubmit = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a prompt to generate an animation.');
            return;
        }
        setIsLoading(true);
        setError(null);
        if (videoBlobUrl) {
            URL.revokeObjectURL(videoBlobUrl);
        }
        setVideoBlobUrl(null);

        try {
            const blob = await generateVideo({ prompt, aspectRatio, resolution });
            setVideoBlobUrl(URL.createObjectURL(blob));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, aspectRatio, resolution, videoBlobUrl]);

    const handleClear = () => {
        setPrompt('');
        if (videoBlobUrl) {
            URL.revokeObjectURL(videoBlobUrl);
        }
        setVideoBlobUrl(null);
        setError(null);
        setAspectRatio('16:9');
        setResolution('720p');
    };

    const handleSelectStyle = (styleValue: string) => {
        setPrompt(prev => prev ? `${prev}, ${styleValue}` : styleValue);
    };

    return (
        <div className="w-full max-w-5xl mx-auto flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            <VideoPanel title="Generated 3D Animation" videoUrl={videoBlobUrl} isLoading={isLoading} />
            {error && (
                <div className="my-4 p-4 w-full text-center bg-red-950/60 border border-red-700 text-red-200 rounded-lg">
                    <p>{error}</p>
                    {error.includes('Requested entity was not found') && (
                        <button
                            onClick={() => window.dispatchEvent(new CustomEvent('openApiKeyModal'))}
                            className="mt-3 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition"
                        >
                            Select a valid key
                        </button>
                    )}
                </div>
            )}
            <div className="sticky bottom-0 left-0 right-0 w-full bg-gray-800/80 backdrop-blur-lg border-t border-gray-700 p-4 rounded-t-lg">
                 <div className="max-w-5xl mx-auto space-y-4">
                    <StyleSelector onSelect={handleSelectStyle} isDisabled={isLoading} />
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="e.g., A robot walking a dog on a futuristic street"
                            className="w-full bg-gray-700 text-gray-200 placeholder-gray-400 border border-gray-600 rounded-md py-3 px-4 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200 h-20 resize-y"
                            disabled={isLoading}
                        />
                        <div className="flex w-full md:w-auto items-center gap-4">
                            <VideoOptionsSelector
                                aspectRatio={aspectRatio}
                                setAspectRatio={setAspectRatio}
                                resolution={resolution}
                                setResolution={setResolution}
                                isDisabled={isLoading}
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={isLoading || !prompt.trim()}
                                className="flex-grow flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 disabled:opacity-50"
                            >
                                {isLoading ? 'Generating...' : (<><span className="text-xl mr-2">🚀</span><span>Generate</span></>)}
                            </button>
                        </div>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default AnimationGenerator;