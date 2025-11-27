import React, { useState, useCallback, useEffect } from 'react';
import { generateVideo } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';
import VideoPanel from './VideoPanel.tsx';
import VideoOptionsSelector, { VideoAspectRatio, Resolution } from './VideoOptionsSelector.tsx';

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


const ImageToVideo: React.FC = () => {
    const [sourceFile, setSourceFile] = useState<FileData | null>(null);
    const [prompt, setPrompt] = useState('');
    const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('16:9');
    const [resolution, setResolution] = useState<Resolution>('720p');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    useEffect(() => {
        return () => { if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl); };
    }, [videoBlobUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setSourceFile({ base64: base64String.split(',')[1], mimeType: file.type });
                if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
                setVideoBlobUrl(null);
                setError(null);
            };
            reader.onerror = () => setError('Failed to read the image file.');
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = useCallback(async () => {
        if (!sourceFile) {
            setError('Please upload an image to generate a video.');
            return;
        }
        setIsLoading(true);
        setError(null);
        if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl);
        setVideoBlobUrl(null);

        try {
            const blob = await generateVideo({ prompt, aspectRatio, resolution, image: sourceFile });
            setVideoBlobUrl(URL.createObjectURL(blob));
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
            setError(errorMessage);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, aspectRatio, resolution, sourceFile, videoBlobUrl]);

    const handleClear = () => {
        setSourceFile(null);
        setPrompt('');
        if (videoBlobUrl) {
            URL.revokeObjectURL(videoBlobUrl);
        }
        setVideoBlobUrl(null);
        setError(null);
        setAspectRatio('16:9');
        setResolution('720p');
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
             <ClearProjectButton onClick={handleClear} />
            <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 mb-4">
                <ImagePanel
                    title="Source Image"
                    imageDataUrl={sourceFile ? `data:${sourceFile.mimeType};base64,${sourceFile.base64}` : null}
                    onFileChange={handleFileChange}
                />
                <VideoPanel title="Generated Video" videoUrl={videoBlobUrl} isLoading={isLoading} />
            </div>
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
                 <div className="flex flex-col md:flex-row items-center gap-4 max-w-5xl mx-auto">
                    <input
                        type="text"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Optional prompt, e.g., 'make the clouds move'"
                        className="w-full bg-slate-800 text-gray-200 placeholder-gray-400 border border-slate-700 rounded-md py-3 px-4 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition duration-200"
                        disabled={isLoading}
                    />
                    <div className="flex items-center gap-2">
                        <VideoOptionsSelector
                            aspectRatio={aspectRatio}
                            setAspectRatio={setAspectRatio}
                            resolution={resolution}
                            setResolution={setResolution}
                            isDisabled={isLoading}
                        />
                        <button
                            onClick={handleSubmit}
                            disabled={isLoading || !sourceFile}
                            className="flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Generating...' : (<><span className="text-xl mr-2">🚀</span><span>Generate</span></>)}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageToVideo;