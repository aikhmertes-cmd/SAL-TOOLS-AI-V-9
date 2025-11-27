import React, { useState, useCallback } from 'react';
import { generateVisualStory, generateImage } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

const languages = [
    'English', 'Khmer', 'Japanese', 'Korean', 'Chinese', 'French', 'Spanish', 'Russian'
];

const stylesList = [
    'Cinematic',
    'Anime',
    'Watercolor',
    'Pixel Art',
    '3D Cartoon',
    'Oil Painting',
    'Sketch',
    'Cyberpunk',
    'Fantasy',
    'Realistic',
    'Comic Book',
    'Low Poly 3D',
    'Claymation',
    'Origami',
    'Neon Cyberpunk',
    'Vintage 1950s',
    'Pop Art',
    'Paper Cutout',
    'Charcoal Sketch'
];

const VisualStoryGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [topic, setTopic] = useState('');
    const [language, setLanguage] = useState('English');
    const [style, setStyle] = useState('Cinematic');
    const [result, setResult] = useState<{ content: string, imagePrompt: string } | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult(null);
        setImageUrl(null);

        try {
            // 1. Generate Text & Prompt
            const storyData = await generateVisualStory(topic, style, language);
            setResult(storyData);

            // 2. Generate Image
            if (storyData.imagePrompt) {
                const img = await generateImage(storyData.imagePrompt, '1:1');
                setImageUrl(img);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [topic, style, language]);

    const handleCopy = () => {
        if (!result?.content) return;
        navigator.clipboard.writeText(result.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!imageUrl) return;
        const link = document.createElement('a');
        link.href = imageUrl;
        link.download = `visual-story-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setTopic('');
        setResult(null);
        setImageUrl(null);
        setError(null);
        setLanguage('English');
        setStyle('Cinematic');
    };

    return (
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 p-4">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                        {t('tool_visual_story')}
                    </h2>
                    <p className="text-gray-400 mt-1">Generate a unique story and illustration in one go.</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Topic / Idea</label>
                    <textarea 
                        value={topic} 
                        onChange={(e) => setTopic(e.target.value)} 
                        placeholder="e.g., A futuristic city where cars fly..." 
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-y"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Language</label>
                        <select value={language} onChange={(e) => setLanguage(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                            {languages.map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Style</label>
                        <select value={style} onChange={(e) => setStyle(e.target.value)} className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500 outline-none">
                            {stylesList.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>

                <div className="pt-4">
                    <button 
                        onClick={handleGenerate} 
                        disabled={isLoading || !topic.trim()} 
                        className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg hover:from-blue-700 hover:to-purple-700 transform transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isLoading ? <><Spinner /> Generating...</> : 'Generate Image & Text'}
                    </button>
                </div>
                {error && <div className="p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg text-sm">{error}</div>}
            </div>

            <div className="flex flex-col items-center justify-start h-full">
                {result && imageUrl ? (
                    <div className="bg-white text-gray-900 rounded-xl overflow-hidden shadow-2xl max-w-md w-full">
                        <div className="relative">
                            <img src={imageUrl} alt="Generated Visual" className="w-full h-auto object-cover" />
                            <button onClick={handleDownload} className="absolute bottom-2 right-2 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition" title="Download Image">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            </button>
                        </div>
                        <div className="p-6">
                            <p className="text-lg leading-relaxed font-serif mb-4">{result.content}</p>
                            <div className="flex justify-end">
                                <button onClick={handleCopy} className="flex items-center gap-1 text-sm font-semibold text-gray-500 hover:text-blue-600 transition">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                                    {copied ? 'Copied!' : 'Copy Text'}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 w-full bg-gray-800/30 border-2 border-dashed border-gray-700 rounded-xl text-gray-500">
                        <p>Your visual story will appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VisualStoryGenerator;