import React, { useState, useCallback } from 'react';
import { generateVideoIdeas } from '../services/geminiService.ts';
import type { VideoIdea } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin h-5 w-5 ${className ?? 'mr-3'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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

const Modal: React.FC<{ title: string; content: string; onClose: () => void }> = ({ title, content, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="promptModalTitle">
            <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
                <h3 id="promptModalTitle" className="text-xl font-bold text-white mb-4">{title}</h3>
                <div className="bg-gray-900 p-4 rounded-md text-gray-300 max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-sm">
                    {content}
                </div>
                <div className="flex justify-end items-center gap-4 mt-6">
                    <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-md transition">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                        {copied ? 'Copied!' : 'Copy Prompt'}
                    </button>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-300 bg-gray-600 hover:bg-gray-500 rounded-md transition">Close</button>
                </div>
            </div>
        </div>
    );
};

const CopyAllIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const DownloadAllIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);


const IdeaGenerator: React.FC = () => {
    const [videoType, setVideoType] = useState('Motivational');
    const [language, setLanguage] = useState('Khmer');
    const [characterStyle, setCharacterStyle] = useState('Stick-man');
    const [minutes, setMinutes] = useState(1);
    const [sceneCount, setSceneCount] = useState(1);
    const [ideaCount, setIdeaCount] = useState(5);
    const [customTopic, setCustomTopic] = useState('Life lessons and personal growth');
    const [ideas, setIdeas] = useState<VideoIdea[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [modalContent, setModalContent] = useState<{ title: string, content: string } | null>(null);
    const [copyStatus, setCopyStatus] = useState<'voice' | 'scene' | null>(null);


    const videoTypes = ['Motivational', 'Educational', 'Comedy', 'Storytelling', 'Advertisement'];
    const languages = ['Khmer', 'English', 'Japanese', 'French'];
    const characterStyles = ['Stick-man', '2D Cartoon', '3D Animation', 'Claymation'];
    const inputFieldClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";

    const handleGenerate = useCallback(async () => {
        if (!customTopic.trim()) {
            setError('Please enter a custom topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setIdeas(null);
        try {
            const result = await generateVideoIdeas({ videoType, language, characterStyle, customTopic, ideaCount });
            setIdeas(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [videoType, language, characterStyle, customTopic, ideaCount]);

    const handleClear = () => {
        setVideoType('Motivational');
        setLanguage('Khmer');
        setCharacterStyle('Stick-man');
        setMinutes(1);
        setSceneCount(1);
        setIdeaCount(5);
        setCustomTopic('Life lessons and personal growth');
        setIdeas(null);
        setError(null);
    };

    const handleSceneCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = parseInt(e.target.value, 10);
        if (isNaN(count)) {
            setSceneCount(1);
        } else if (count < 1) {
            setSceneCount(1);
        } else if (count > 100) {
            setSceneCount(100);
        } else {
            setSceneCount(count);
        }
    };
    
    const handleIdeaCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = parseInt(e.target.value, 10);
        if (isNaN(count)) {
            setIdeaCount(1);
        } else if (count < 1) {
            setIdeaCount(1);
        } else if (count > 50) {
            setIdeaCount(50);
        } else {
            setIdeaCount(count);
        }
    };

    const handleShowVoicePrompt = (idea: VideoIdea) => {
        const fullPrompt = `Generate a full voiceover script for a ${minutes}-minute video in ${language}.
    
**Video Title:** ${idea.title}
**Core Idea:** ${idea.summary}
**Starting Line:** "${idea.sampleScriptLine}"

The script should expand on the core idea, be motivational and clear in tone, and be paced appropriately for a ${minutes}-minute duration. Structure it with paragraphs for easy reading.`;
        setModalContent({ title: `Voiceover Prompt for "${idea.title}"`, content: fullPrompt });
    };
    
    const handleShowScenePrompt = (idea: VideoIdea) => {
        const scenePrompt = `Create a script for a ${minutes}-minute animated video based on the following idea. The video should be broken down into exactly ${sceneCount} scenes.

**Main Idea:** ${idea.title}
**Summary:** ${idea.summary}
**Visual Style:** A minimalist animation featuring a ${characterStyle}. The overall style is simple, clean, and motivational.
**Total Duration:** ${minutes} minute(s).

For each of the ${sceneCount} scenes, provide:
1. A brief "Scene Description" of what is happening visually.
2. A "Visual Prompt" for an AI image generator that describes the specific shot, including the ${characterStyle}'s actions and the background.`;
        setModalContent({ title: `Virtual Scene Prompts for "${idea.title}"`, content: scenePrompt });
    };

    const getAllPrompts = useCallback((type: 'voiceover' | 'scene'): string => {
        if (!ideas) return '';
        return ideas.map((idea, index) => {
            const header = `--- IDEA ${index + 1}: ${idea.title} ---`;
            let promptContent = '';
            if (type === 'voiceover') {
                promptContent = `Generate a full voiceover script for a ${minutes}-minute video in ${language}.
    
**Video Title:** ${idea.title}
**Core Idea:** ${idea.summary}
**Starting Line:** "${idea.sampleScriptLine}"

The script should expand on the core idea, be motivational and clear in tone, and be paced appropriately for a ${minutes}-minute duration. Structure it with paragraphs for easy reading.`;
            } else { // scene
                promptContent = `Create a script for a ${minutes}-minute animated video based on the following idea. The video should be broken down into exactly ${sceneCount} scenes.

**Main Idea:** ${idea.title}
**Summary:** ${idea.summary}
**Visual Style:** A minimalist animation featuring a ${characterStyle}. The overall style is simple, clean, and motivational.
**Total Duration:** ${minutes} minute(s).

For each of the ${sceneCount} scenes, provide:
1. A brief "Scene Description" of what is happening visually.
2. A "Visual Prompt" for an AI image generator that describes the specific shot, including the ${characterStyle}'s actions and the background.`;
            }
            return `${header}\n\n${promptContent}`;
        }).join('\n\n========================================\n\n');
    }, [ideas, language, sceneCount, characterStyle, minutes]);

    const handleCopyAll = useCallback((type: 'voiceover' | 'scene') => {
        const allPrompts = getAllPrompts(type);
        navigator.clipboard.writeText(allPrompts);
        setCopyStatus(type);
        setTimeout(() => setCopyStatus(null), 2000);
    }, [getAllPrompts]);

    const handleDownloadAll = useCallback((type: 'voiceover' | 'scene') => {
        const allPrompts = getAllPrompts(type);
        const blob = new Blob([allPrompts], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${type}_prompts_all.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, [getAllPrompts]);

    return (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Video Idea Generator</h2>
                    <p className="text-gray-400 mt-1">Get creative concepts for your next video project.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Video Type</label>
                        <select value={videoType} onChange={e => setVideoType(e.target.value)} className={inputFieldClasses}>
                            {videoTypes.map(type => <option key={type} value={type}>{type}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Language</label>
                        <select value={language} onChange={e => setLanguage(e.target.value)} className={inputFieldClasses}>
                            {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Character Style</label>
                        <select value={characterStyle} onChange={e => setCharacterStyle(e.target.value)} className={inputFieldClasses}>
                            {characterStyles.map(style => <option key={style} value={style}>{style}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="idea-count" className="block text-sm font-semibold mb-2 text-gray-300">Number of Ideas</label>
                        <input
                            id="idea-count"
                            type="number"
                            value={ideaCount}
                            onChange={handleIdeaCountChange}
                            min="1"
                            max="50"
                            className={inputFieldClasses}
                        />
                    </div>
                </div>

                <div>
                    <label htmlFor="custom-topic" className="block text-sm font-semibold mb-2 text-gray-300">Main Theme / Topic</label>
                    <textarea id="custom-topic" value={customTopic} onChange={e => setCustomTopic(e.target.value)} placeholder="e.g., Overcoming fear, The importance of friendship" className={`${inputFieldClasses} h-24 resize-y`} />
                </div>
                
                {error && <div className="p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">{error}</div>}

                <div className="pt-4 border-t border-gray-700">
                    <button onClick={handleGenerate} disabled={isLoading} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition disabled:opacity-50">
                        {isLoading ? <Spinner /> : '💡'}
                        {isLoading ? 'Generating Ideas...' : 'Generate Ideas'}
                    </button>
                </div>
            </div>

             <div>
                {ideas && ideas.length > 0 && (
                    <div className="w-full bg-gray-900/50 p-4 rounded-lg border border-gray-700 mb-4 animate-fade-in" style={{animation: 'fadeIn 0.5s ease-out forwards'}}>
                         <h3 className="text-md font-semibold text-gray-300 text-center mb-4">Export All Prompts</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="space-y-2">
                                 <h4 className="text-sm font-semibold text-gray-400">🎤 Voiceover Prompts</h4>
                                 <div className="flex gap-2">
                                     <button onClick={() => handleCopyAll('voiceover')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-500 transition">
                                         <CopyAllIcon /> {copyStatus === 'voiceover' ? 'Copied!' : 'Copy All'}
                                     </button>
                                     <button onClick={() => handleDownloadAll('voiceover')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 transition">
                                         <DownloadAllIcon /> Download All
                                     </button>
                                 </div>
                             </div>
                             <div className="space-y-2">
                                 <h4 className="text-sm font-semibold text-gray-400">🎬 Scene Prompts</h4>
                                 <div className="flex gap-2">
                                     <button onClick={() => handleCopyAll('scene')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-500 transition">
                                         <CopyAllIcon /> {copyStatus === 'scene' ? 'Copied!' : 'Copy All'}
                                     </button>
                                     <button onClick={() => handleDownloadAll('scene')} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-500 transition">
                                         <DownloadAllIcon /> Download All
                                     </button>
                                 </div>
                             </div>
                         </div>
                    </div>
                )}
                <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 min-h-[70vh]">
                    <h2 className="text-lg font-semibold text-gray-300 mb-4 text-center">Generated Ideas</h2>
                    <div className="flex-grow bg-gray-900 rounded-md flex relative overflow-y-auto p-4">
                        {isLoading ? (
                            <div className="m-auto text-center"><Spinner className="h-10 w-10 text-cyan-400" /></div>
                        ) : ideas ? (
                            <div className="w-full space-y-4">
                                {ideas.map((idea, index) => (
                                    <div key={index} className="bg-gray-800 p-4 rounded-lg border-l-4 border-cyan-500 animate-fade-in" style={{animation: 'fadeIn 0.5s ease-out forwards'}}>
                                        <h3 className="text-lg font-bold text-cyan-400">{idea.title}</h3>
                                        <p className="text-gray-300 mt-2 text-sm">{idea.summary}</p>
                                        <p className="text-gray-400 mt-3 text-sm italic border-t border-gray-700 pt-2">"{idea.sampleScriptLine}"</p>
                                        <div className="mt-4 pt-3 border-t border-gray-700/50 flex flex-wrap gap-2">
                                            <button onClick={() => handleShowVoicePrompt(idea)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 rounded-md shadow-sm hover:bg-teal-500 transition">
                                                🎤 Voiceover Prompt
                                            </button>
                                            <button onClick={() => handleShowScenePrompt(idea)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-md shadow-sm hover:bg-indigo-500 transition">
                                                🎬 Scene Prompt
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="m-auto text-center text-gray-500">
                                <p>Your generated video ideas will appear here.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            {modalContent && <Modal title={modalContent.title} content={modalContent.content} onClose={() => setModalContent(null)} />}
        </div>
    );
};

export default IdeaGenerator;
