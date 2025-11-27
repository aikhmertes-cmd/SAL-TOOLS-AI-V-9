
import React, { useState, useCallback, useMemo } from 'react';
import { generateTrailerScript, generateCharacters } from '../services/geminiService.ts';
import type { StoryScene, Character } from '../services/geminiService.ts';
import StoryPanel from './StoryPanel.tsx';
import { styles } from './styles.ts';

// --- Icons ---
const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);
const TrashIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);
const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h8M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
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

interface ExtendedCharacter extends Character {
    id: number;
}

const MovieTrailerGenerator: React.FC = () => {
    const allowedStyleNames = ['Vlog Video', 'Mukbang Style', 'Record Video', 'Simple Style'];
    // Filter styles carefully
    const trailerStyles = styles.filter(s => allowedStyleNames.includes(s.name));

    // State
    const [title, setTitle] = useState('');
    const [synopsis, setSynopsis] = useState('');
    const [visualStyle, setVisualStyle] = useState<string>(trailerStyles.length > 0 ? trailerStyles[0].value : '');
    const [sceneCount, setSceneCount] = useState(12);
    const [trailerScript, setTrailerScript] = useState<StoryScene[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [noVoiceover, setNoVoiceover] = useState(false);
    const [noSubtitle, setNoSubtitle] = useState(false);
    const [focusOnCharacters, setFocusOnCharacters] = useState(true);

    // Character Generation State
    const [characters, setCharacters] = useState<ExtendedCharacter[]>([]);
    const [aiCharacterCount, setAiCharacterCount] = useState(2);
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
    const [copiedCharacterId, setCopiedCharacterId] = useState<number | null>(null);


    const inputFieldClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";

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

    // Character Handlers
    const handleAiSuggestCharacters = useCallback(async () => {
        if (!synopsis.trim() && !characterPrompt.trim()) {
            setError('Please provide a Synopsis OR a Custom Character Prompt below to generate characters.');
            return;
        }
        setIsGeneratingCharacters(true);
        setError(null);
        try {
            // Use synopsis as context if no specific character prompt is provided
            const context = synopsis.trim() || "A generic movie trailer story";
            const contextWithStyle = `${context}\n\nTarget Visual Style: ${visualStyle}`;
            
            const generated = await generateCharacters(contextWithStyle, aiCharacterCount, characterPrompt.trim() || undefined);
            setCharacters(prev => [...prev, ...generated.map(c => ({...c, id: Date.now() + Math.random()}))]);
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Failed to generate characters.');
        } finally {
            setIsGeneratingCharacters(false);
        }
    }, [synopsis, aiCharacterCount, visualStyle, characterPrompt]);

    const addCharacter = () => {
        setCharacters([...characters, { id: Date.now(), name: '', gender: 'Female', age: '', description: '' }]);
    };

    const removeCharacter = (id: number) => {
        setCharacters(characters.filter(char => char.id !== id));
    };

    const updateCharacter = (id: number, field: keyof Omit<Character, 'id'>, value: string) => {
        setCharacters(characters.map(char => char.id === id ? { ...char, [field]: value } : char));
    };

    const handleCopyCharacterPrompt = (char: ExtendedCharacter) => {
        const prompt = `Character Design Prompt:\n\nName: ${char.name}\nGender: ${char.gender}\nAge: ${char.age}\n\nDescription: ${char.description}\n\nVisual Style: ${visualStyle}`;
        navigator.clipboard.writeText(prompt);
        setCopiedCharacterId(char.id);
        setTimeout(() => setCopiedCharacterId(null), 2000);
    };


    const handleSubmit = useCallback(async () => {
        if (!synopsis.trim()) {
            setError('Please enter a synopsis for the trailer.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setTrailerScript(null);

        try {
            // Hardcoded Genre/Tone for these reality styles
            const finalGenre = 'Reality';
            const finalTone = 'Casual';

            // Clean up characters to ensure valid data
            const validCharacters = characters.filter(c => c.name.trim() && c.description.trim());

            const result = await generateTrailerScript({
                title,
                synopsis,
                genre: finalGenre,
                tone: finalTone,
                visualStyle,
                sceneCount,
                noVoiceover,
                noSubtitle,
                focusOnCharacters,
                characters: validCharacters, // Pass the explicit character objects
            });
            setTrailerScript(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [title, synopsis, visualStyle, sceneCount, noVoiceover, noSubtitle, focusOnCharacters, characters]);
    
    const handleClear = () => {
        setTitle('');
        setSynopsis('');
        setVisualStyle(trailerStyles.length > 0 ? trailerStyles[0].value : '');
        setSceneCount(12);
        setTrailerScript(null);
        setError(null);
        setNoVoiceover(false);
        setNoSubtitle(false);
        setFocusOnCharacters(true);
        setCharacters([]);
        setCharacterPrompt('');
    };

    return (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Movie Trailer Generator</h2>
                
                 <div>
                    <label htmlFor="title" className="block text-sm font-semibold mb-2 text-gray-300">Movie Title (Optional)</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., The Last Starlight"
                        className={inputFieldClasses}
                        disabled={isLoading}
                    />
                </div>
                
                 <div>
                    <label htmlFor="synopsis" className="block text-sm font-semibold mb-2 text-gray-300">Synopsis</label>
                    <textarea
                        id="synopsis"
                        value={synopsis}
                        onChange={(e) => setSynopsis(e.target.value)}
                        placeholder={"Describe the plot of your movie. What is it about? Who are the main characters? What is the central conflict?"}
                        className={`${inputFieldClasses} h-32 resize-y`}
                        disabled={isLoading}
                    />
                </div>

                {/* Character Generation Section */}
                <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700 space-y-3">
                    <label className="block text-sm font-semibold text-gray-300">Auto-generate Characters (Smart Thinking)</label>
                    
                    {/* Visual Style for Characters - Reusing the main Visual Style logic */}
                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Visual Style (Linked to Trailer Style)</label>
                        <select 
                            value={visualStyle} 
                            onChange={(e) => setVisualStyle(e.target.value)} 
                            className={`${inputFieldClasses} mb-3`}
                            disabled={isLoading}
                        >
                            {trailerStyles.map(s => <option key={s.name} value={s.value}>{s.name}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Paste Prompt for Characters (Optional)</label>
                        <textarea 
                            value={characterPrompt} 
                            onChange={(e) => setCharacterPrompt(e.target.value)} 
                            placeholder="e.g., Create a friendly alien with blue skin and a robotic pet."
                            className={`${inputFieldClasses} h-20 resize-y mb-3`}
                            disabled={isLoading}
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        <input type="number" value={aiCharacterCount} onChange={(e) => setAiCharacterCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))} className={`${inputFieldClasses} w-20`} min="1" max="5" disabled={isLoading} />
                        <button onClick={handleAiSuggestCharacters} disabled={isGeneratingCharacters || (!synopsis.trim() && !characterPrompt.trim())} className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg shadow-md hover:from-teal-600 hover:to-cyan-600 transition disabled:opacity-50">
                            {isGeneratingCharacters ? 'Generating...' : 'Generate with AI'}
                        </button>
                    </div>
                    <p className="text-xs text-gray-500">Provide a story synopsis OR paste a specific character prompt above.</p>
                </div>

                {/* Character List */}
                <div className="space-y-4">
                    {characters.map((char, index) => (
                        <div key={char.id} className="p-4 rounded-lg bg-gray-800 border border-gray-700 relative space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold text-cyan-400">Character {index + 1}</h3>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => handleCopyCharacterPrompt(char)} 
                                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 hover:bg-gray-600 rounded transition border border-gray-600"
                                        title="Copy Character Prompt"
                                    >
                                        <CopyIcon className="h-3 w-3"/>
                                        {copiedCharacterId === char.id ? 'Copied!' : 'Copy Prompt'}
                                    </button>
                                    <button onClick={() => removeCharacter(char.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition">
                                        <TrashIcon />
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <input type="text" placeholder="Name" value={char.name} onChange={(e) => updateCharacter(char.id, 'name', e.target.value)} className={inputFieldClasses} />
                                <input type="text" placeholder="Age (e.g., 20s)" value={char.age} onChange={(e) => updateCharacter(char.id, 'age', e.target.value)} className={inputFieldClasses} />
                                <select value={char.gender} onChange={(e) => updateCharacter(char.id, 'gender', e.target.value)} className={inputFieldClasses}>
                                    <option>Female</option>
                                    <option>Male</option>
                                    <option>Non-binary</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <textarea placeholder="Characteristics of the whole character (personality, appearance, motivations)..." value={char.description} onChange={(e) => updateCharacter(char.id, 'description', e.target.value)} className={`${inputFieldClasses} h-24 resize-y`} />
                        </div>
                    ))}
                    <button onClick={addCharacter} className="flex items-center text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition">
                        <PlusIcon /> Add Character Manually
                    </button>
                </div>
                
                 <div>
                    <label htmlFor="scenes" className="block text-sm font-semibold mb-2 text-gray-300">Number of Scenes</label>
                    <div className="relative flex items-center">
                        <button
                            onClick={() => setSceneCount(prev => Math.max(1, prev - 1))}
                            className="absolute left-0 top-0 bottom-0 px-3 text-lg font-bold text-gray-400 hover:text-white bg-gray-700/50 rounded-l-lg disabled:opacity-50"
                            aria-label="Decrease scene count"
                            disabled={isLoading}
                        >
                            -
                        </button>
                        <input
                            type="number"
                            id="scenes"
                            value={sceneCount}
                            onChange={handleSceneCountChange}
                            className={`${inputFieldClasses} text-center w-full pl-10 pr-10`}
                            min="1"
                            max="100"
                            disabled={isLoading}
                        />
                        <button
                            onClick={() => setSceneCount(prev => Math.min(100, prev + 1))}
                            className="absolute right-0 top-0 bottom-0 px-3 text-lg font-bold text-gray-400 hover:text-white bg-gray-700/50 rounded-r-lg disabled:opacity-50"
                            aria-label="Increase scene count"
                            disabled={isLoading}
                        >
                            +
                        </button>
                    </div>
                     <p className="mt-2 text-xs text-gray-400">The trailer will be broken down into this many scenes. Max 100.</p>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Advanced Options</label>
                    <div className="space-y-3 p-4 bg-gray-700/50 rounded-lg">
                        <div className="relative flex items-start">
                            <div className="flex h-6 items-center">
                                <input id="noVoiceover" type="checkbox" checked={noVoiceover} onChange={(e) => setNoVoiceover(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-purple-500 focus:ring-purple-600"/>
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="noVoiceover" className="font-medium text-gray-300">No Voiceover</label>
                                <p className="text-gray-400">Generate a trailer without narrator voiceover.</p>
                            </div>
                        </div>
                        <div className="relative flex items-start">
                            <div className="flex h-6 items-center">
                                <input id="noSubtitle" type="checkbox" checked={noSubtitle} onChange={(e) => setNoSubtitle(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-purple-500 focus:ring-purple-600"/>
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="noSubtitle" className="font-medium text-gray-300">No On-Screen Text</label>
                                <p className="text-gray-400">Generate a trailer without any text overlays (subtitles).</p>
                            </div>
                        </div>
                        <div className="relative flex items-start">
                            <div className="flex h-6 items-center">
                                <input id="focusOnCharacters" type="checkbox" checked={focusOnCharacters} onChange={(e) => setFocusOnCharacters(e.target.checked)} disabled={isLoading} className="h-4 w-4 rounded border-gray-500 bg-gray-600 text-purple-500 focus:ring-purple-600"/>
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="focusOnCharacters" className="font-medium text-gray-300">Focus on Characters (Face Consistency)</label>
                                <p className="text-gray-400">Strictly enforce consistent facial features for characters in every scene.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Visual Style</label>
                    <div className="grid grid-cols-2 gap-2">
                        {trailerStyles.map(styleOpt => (
                            <button 
                                key={styleOpt.name} 
                                onClick={() => setVisualStyle(styleOpt.value)} 
                                disabled={isLoading}
                                className={`px-3 py-2 text-sm font-semibold rounded-md transition w-full disabled:opacity-50 ${visualStyle === styleOpt.value ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                {styleOpt.name}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !synopsis.trim()}
                    className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Generating Script...' : <><span className="text-xl mr-2">📜</span><span>Generate Trailer Script</span></>}
                </button>
            </div>
             <div className="w-full">
                {error && (
                    <div className="mb-4 p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                        {error}
                    </div>
                )}
                <StoryPanel
                    story={trailerScript}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};

export default MovieTrailerGenerator;
