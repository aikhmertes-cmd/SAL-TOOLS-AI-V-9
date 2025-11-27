import React, { useState, useCallback, useEffect } from 'react';
import { generateVideo } from '../services/geminiService.ts';
import VideoPanel from './VideoPanel.tsx';
import { useLanguage } from './LanguageContext.tsx';

const Spinner: React.FC = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

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

const stylesList = [
    { name: 'Author Portrait (Realistic)', value: 'A realistic, cinematic moving portrait of the author. High detail, 8k, dramatic lighting.' },
    { name: 'Cinematic Nature', value: 'A breathtaking nature scene, calm and atmospheric, cinematic lighting, 4k.' },
    { name: 'Abstract Particles', value: 'Abstract glowing particles floating in dark space, elegant and magical.' },
    { name: 'Vintage/Historical', value: 'Old film grain style, black and white, historical footage atmosphere.' },
    { name: 'Cyberpunk Neon', value: 'Futuristic cyberpunk city with neon lights, rain, moody atmosphere.' },
    { name: 'Minimalist Animation', value: 'Clean, minimalist 2D animation, soft pastel colors, smooth motion.' },
    { name: 'Cosmic Space', value: 'Deep space, nebula, stars moving slowly, majestic and vast.' },
    { name: 'Dark Academia', value: 'Old library, candle light, dust motes dancing, cozy and intellectual.' },
];

const AnimatedQuoteGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [quote, setQuote] = useState('');
    const [author, setAuthor] = useState('');
    const [selectedStyle, setSelectedStyle] = useState(stylesList[0].value);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        return () => {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
        };
    }, [videoUrl]);

    const handleGenerate = useCallback(async () => {
        if (!quote.trim()) {
            setError('Please enter a quote.');
            return;
        }
        setIsLoading(true);
        setError(null);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);

        try {
            // Construct a specific prompt for the video model
            const authorText = author.trim() ? author : 'Unknown';
            const visualPrompt = selectedStyle.includes('author') && author.trim() 
                ? selectedStyle.replace('the author', author) 
                : selectedStyle;

            const fullPrompt = `Generate a vertical 9:16 video. 
            Visuals: ${visualPrompt}
            Overlay Text: The video MUST contain the text "${quote}" clearly visible in the center.
            Subtitle: "${authorText}" displayed below the quote.
            Style: High quality, professional typography, legible font, cinematic composition.`;

            const blob = await generateVideo({ 
                prompt: fullPrompt, 
                aspectRatio: '9:16', 
                resolution: '720p' 
            });
            setVideoUrl(URL.createObjectURL(blob));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [quote, author, selectedStyle, videoUrl]);

    const handleClear = () => {
        setQuote('');
        setAuthor('');
        setSelectedStyle(stylesList[0].value);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setError(null);
    };

    const inputClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";

    return (
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                        Animated Quote Video
                    </h2>
                    <p className="text-gray-400 mt-1">Turn quotes into viral vertical videos.</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Quote</label>
                    <textarea 
                        value={quote} 
                        onChange={(e) => setQuote(e.target.value)} 
                        placeholder="e.g., In the middle of every difficulty lies opportunity." 
                        className={`${inputClasses} h-32 resize-y`}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Author</label>
                    <input 
                        type="text" 
                        value={author} 
                        onChange={(e) => setAuthor(e.target.value)} 
                        placeholder="e.g., Albert Einstein" 
                        className={inputClasses}
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Visual Style</label>
                    <select 
                        value={selectedStyle} 
                        onChange={(e) => setSelectedStyle(e.target.value)} 
                        className={inputClasses}
                    >
                        {stylesList.map((style, idx) => (
                            <option key={idx} value={style.value}>{style.name}</option>
                        ))}
                    </select>
                </div>

                <div className="pt-4 border-t border-gray-700">
                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !quote.trim()} 
                        className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-emerald-500 to-cyan-600 rounded-lg shadow-lg border-b-4 border-emerald-700 hover:from-emerald-600 hover:to-cyan-700 transform transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? <><Spinner /> Generating Video...</> : <><span className="text-xl mr-2">🎬</span>Generate Video</>}
                    </button>
                </div>
                
                {error && (
                    <div className="p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">
                        {error}
                    </div>
                )}
            </div>

            {/* Output */}
            <div className="flex flex-col items-center justify-center">
                <div className="w-full max-w-sm mx-auto">
                    <VideoPanel title="Generated Quote Video" videoUrl={videoUrl} isLoading={isLoading} />
                    {videoUrl && (
                        <div className="mt-4 text-center">
                            <a 
                                href={videoUrl} 
                                download={`quote-video-${Date.now()}.mp4`}
                                className="inline-flex items-center px-6 py-3 font-bold text-white bg-gray-700 rounded-lg hover:bg-gray-600 transition shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                                Download Video
                            </a>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnimatedQuoteGenerator;
