import React, { useState, useCallback } from 'react';
import { generateThumbnail } from '../services/geminiService.ts';
import ImagePanel from './ImagePanel.tsx';
import { useLanguage } from './LanguageContext.tsx';

const stylesList = [
    'Viral / MrBeast Style',
    'Gaming / Streamer',
    'Vlog / Lifestyle',
    'Tech Review / Clean',
    'Educational / Documentary',
    'Minimalist / Aesthetic',
    'Dramatic / High Contrast',
    'Horror / Mystery',
    'Comedy / Fun',
    'Business / Professional'
];

const Spinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ClearProjectButton: React.FC<{ onClick: () => void }> = ({ onClick }) => (
    <div className="w-full flex justify-end mb-4">
        <button onClick={onClick} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-red-300 bg-red-900/40 border border-red-800 rounded-lg hover:bg-red-900/80 transition-colors duration-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            Clear Project
        </button>
    </div>
);

const ThumbnailGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [style, setStyle] = useState(stylesList[0]);
    const [generatedImage, setGeneratedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleGenerate = useCallback(async () => {
        if (!title.trim()) {
            setError('Please enter a video title.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImage(null);

        try {
            const image = await generateThumbnail(title, description, style);
            setGeneratedImage(image);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [title, description, style]);

    const handleDownload = () => {
        if (!generatedImage) return;
        const link = document.createElement('a');
        link.href = generatedImage;
        link.download = `thumbnail-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setTitle('');
        setDescription('');
        setStyle(stylesList[0]);
        setGeneratedImage(null);
        setError(null);
    };

    const inputClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-3 placeholder-gray-400";

    return (
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
            {/* Controls */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500">
                        {t('tool_thumbnail_generator')}
                    </h2>
                    <p className="text-gray-400 mt-1">Create high-CTR YouTube thumbnails instantly.</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Video Title (Included in Image)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., I SURVIVED 100 Days in Minecraft!"
                        className={inputClasses}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Video Context / Description</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Briefly describe the video content to help AI generate relevant visuals..."
                        className={`${inputClasses} h-32 resize-y`}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Visual Style</label>
                    <div className="grid grid-cols-2 gap-2">
                        {stylesList.map(s => (
                            <button
                                key={s}
                                onClick={() => setStyle(s)}
                                className={`px-3 py-2 text-xs font-semibold rounded-md transition border ${style === s ? 'bg-red-600 text-white border-red-400' : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'}`}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !title.trim()}
                        className="w-full flex items-center justify-center px-6 py-3 font-bold text-white bg-gradient-to-r from-red-600 to-orange-600 rounded-lg shadow-lg hover:from-red-700 hover:to-orange-700 transform transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? <><Spinner /> Generating...</> : 'Generate Thumbnail'}
                    </button>
                </div>
                {error && <div className="p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>}
            </div>

            {/* Output */}
            <div className="flex flex-col items-center justify-start h-full">
                <div className="w-full aspect-video bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative shadow-2xl flex items-center justify-center">
                    {generatedImage ? (
                        <img src={generatedImage} alt="Generated Thumbnail" className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center text-gray-500">
                            <span className="text-6xl block mb-4 opacity-50">🖼️</span>
                            <p>Your thumbnail will appear here.</p>
                        </div>
                    )}
                    {isLoading && (
                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm">
                            <Spinner />
                            <p className="text-white mt-2 text-sm font-semibold">Creating Thumbnail...</p>
                        </div>
                    )}
                </div>
                
                {generatedImage && (
                    <button 
                        onClick={handleDownload} 
                        className="mt-6 flex items-center justify-center px-8 py-3 font-bold text-white bg-gray-700 rounded-lg shadow-md hover:bg-gray-600 transition transform hover:scale-105"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Download Thumbnail
                    </button>
                )}
            </div>
        </div>
    );
};

export default ThumbnailGenerator;