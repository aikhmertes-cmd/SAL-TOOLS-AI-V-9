
import React, { useState, useCallback } from 'react';
import { generateStory, StoryScene, analyzeStoryForCharacters, generateStoryIdeas, StoryIdea, Character as ServiceCharacter, generateCharacters } from '../services/geminiService.ts';
import StoryPanel from './StoryPanel.tsx';
import { styles } from './styles.ts';

type GeneratorMode = 'new' | 'paste' | 'ideas';
type InnerTab = 'characters' | 'script';

interface Character {
    id: number;
    name: string;
    gender: string;
    age: string;
    description: string;
}

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


const StoryGenerator: React.FC = () => {
    const [innerTab, setInnerTab] = useState<InnerTab>('characters');
    const [mode, setMode] = useState<GeneratorMode>('new');
    const [topic, setTopic] = useState('');
    const [genderFocus, setGenderFocus] = useState('');
    const [smartThinking, setSmartThinking] = useState(true);
    const [pastedStory, setPastedStory] = useState('');
    const [storyType, setStoryType] = useState('');
    const [style, setStyle] = useState<string>(styles[4].value); // Default to Pixar 3D
    const [sceneCount, setSceneCount] = useState(10);
    const [characters, setCharacters] = useState<Character[]>([
        { id: Date.now(), name: '', gender: 'Female', age: '', description: '' }
    ]);
    const [aiCharacterCount, setAiCharacterCount] = useState(2);
    const [characterStyle, setCharacterStyle] = useState<string>(styles[4].value); // Default to Pixar 3D
    const [characterPrompt, setCharacterPrompt] = useState('');
    const [copiedCharacterId, setCopiedCharacterId] = useState<number | null>(null);

    const [story, setStory] = useState<StoryScene[] | null>(null);
    const [storyIdeas, setStoryIdeas] = useState<StoryIdea[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingIdeas, setIsGeneratingIdeas] = useState(false);
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const inputFieldClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";
    const genderFocusOptions = ['Any', 'Female Protagonist', 'Male Protagonist', 'Action Heroine', 'Female-led Ensemble', 'Male-led Ensemble', 'Balanced Ensemble'];

    const handleSceneCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = parseInt(e.target.value, 10);
        if (isNaN(count)) {
            setSceneCount(1); // Default to 1 if input is not a number
        } else if (count < 1) {
            setSceneCount(1);
        } else if (count > 100) {
            setSceneCount(100);
        } else {
            setSceneCount(count);
        }
    };
    
    const handleClear = () => {
        setTopic('');
        setGenderFocus('');
        setSmartThinking(false);
        setPastedStory('');
        setStoryType('');
        setCharacters([{ id: Date.now(), name: '', gender: 'Female', age: '', description: '' }]);
        setStory(null);
        setStoryIdeas(null);
        setError(null);
        setAnalysisComplete(false);
        setCharacterStyle(styles[4].value);
        setCharacterPrompt('');
    }
    
    const handleModeChange = (newMode: GeneratorMode) => {
        setMode(newMode);
        // Clear only mode-specific inputs and outputs.
        // This preserves characters, style, scene count, and smart thinking settings.
        setTopic('');
        setGenderFocus('');
        setPastedStory('');
        setStoryType('');
        setStory(null);
        setStoryIdeas(null);
        setError(null);
        setAnalysisComplete(false);
    };

    const addCharacter = () => {
        setCharacters([...characters, { id: Date.now(), name: '', gender: 'Female', age: '', description: '' }]);
    };

    const removeCharacter = (id: number) => {
        setCharacters(characters.filter(char => char.id !== id));
    };

    const updateCharacter = (id: number, field: keyof Omit<Character, 'id'>, value: string) => {
        setCharacters(characters.map(char => char.id === id ? { ...char, [field]: value } : char));
    };

    const handleAnalyze = useCallback(async () => {
        if (!pastedStory.trim()) {
            setError('Please paste a story to analyze.');
            return;
        }
        setIsAnalyzing(true);
        setError(null);

        try {
            const analyzedChars = await analyzeStoryForCharacters(pastedStory);
            if (analyzedChars.length > 0) {
                 setCharacters(analyzedChars.map(c => ({...c, id: Math.random(), age: '', description: ''})));
            } else {
                setCharacters([{ id: Date.now(), name: '', gender: 'Female', age: '', description: '' }]);
            }
            setAnalysisComplete(true);
            setInnerTab('script'); // Move to next step
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsAnalyzing(false);
        }

    }, [pastedStory]);
    
    const handleAiSuggestCharacters = useCallback(async () => {
        const context = mode === 'paste' ? pastedStory : topic;
        if (!context.trim() && !characterPrompt.trim()) {
            setError('Please provide a Story Topic, Script, or a Custom Character Prompt before generating characters.');
            return;
        }
        setIsGeneratingCharacters(true);
        setError(null);
        try {
            const contextWithStyle = `${context}\n\nTarget Visual Style: ${characterStyle}`;
            // Pass the custom prompt separately if it exists, otherwise undefined
            const generated = await generateCharacters(contextWithStyle, aiCharacterCount, characterPrompt.trim() || undefined);
            setCharacters(generated.map(c => ({...c, id: Math.random()})));
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Failed to generate characters.');
        } finally {
            setIsGeneratingCharacters(false);
        }
    }, [topic, pastedStory, mode, aiCharacterCount, characterStyle, characterPrompt]);

    const handleCopyCharacterPrompt = (char: Character) => {
        const prompt = `Character Design Prompt:\n\nName: ${char.name}\nGender: ${char.gender}\nAge: ${char.age}\n\nDescription: ${char.description}\n\nVisual Style: ${characterStyle}`;
        navigator.clipboard.writeText(prompt);
        setCopiedCharacterId(char.id);
        setTimeout(() => setCopiedCharacterId(null), 2000);
    };

    const handleGenerateIdeas = useCallback(async () => {
        if (!storyType.trim()) {
            setError('Please enter a story type or theme.');
            return;
        }
        setIsGeneratingIdeas(true);
        setStoryIdeas(null);
        setError(null);

        try {
            const ideas = await generateStoryIdeas(storyType, smartThinking);
            setStoryIdeas(ideas);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsGeneratingIdeas(false);
        }
    }, [storyType, smartThinking]);

    const handleUseIdea = (summary: string) => {
        handleModeChange('paste');
        setInnerTab('script');
        setPastedStory(summary);
    };

    const handleSubmit = useCallback(async () => {
        setError(null);
        
        if (mode === 'new' && !topic.trim()) {
            setError('Please enter a story topic.');
            return;
        }
        if (mode === 'paste' && !pastedStory.trim()) {
            setError('Please paste a story.');
            return;
        }
        
        const finalCharacters: ServiceCharacter[] = characters
            .filter(c => c.name.trim() && c.gender.trim() && c.age.trim() && c.description.trim())
            .map(({ id, ...rest }) => rest);

        if (finalCharacters.length === 0) {
            setError('Please define at least one character with a name, gender, age, and description.');
            return;
        }

        setIsLoading(true);
        setStory(null);

        try {
            const result = await generateStory({
                topic: mode === 'new' ? topic : undefined,
                genderFocus: mode === 'new' ? genderFocus : undefined,
                smartThinking,
                pastedStory: mode === 'paste' ? pastedStory : undefined,
                style,
                sceneCount,
                characters: finalCharacters,
            });
            setStory(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [mode, topic, genderFocus, pastedStory, style, sceneCount, characters, smartThinking]);

    const isReadyToSubmit = characters.some(c => c.name.trim() && c.gender.trim() && c.age.trim() && c.description.trim()) && (mode === 'new' ? !!topic.trim() : (mode === 'paste' ? analysisComplete : false));
    
    const getTabClass = (tabName: GeneratorMode | InnerTab) => {
        const isActive = mode === tabName || innerTab === tabName;
        return `font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 text-center transform active:scale-95 ${
        isActive
            ? 'bg-gray-700 text-white shadow-inner'
            : 'bg-transparent text-gray-400 hover:bg-gray-700/50'
        }`;
    };

    return (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <div className="flex bg-gray-800 p-1 rounded-lg border border-gray-700 mb-6">
                    <button onClick={() => { setInnerTab('characters'); handleModeChange('new'); }} className={`${getTabClass('new')} w-1/3`}>Create New</button>
                    <button onClick={() => { setInnerTab('script'); handleModeChange('paste'); }} className={`${getTabClass('paste')} w-1/3`}>From Script</button>
                    <button onClick={() => { setInnerTab('script'); handleModeChange('ideas'); }} className={`${getTabClass('ideas')} w-1/3`}>Get Ideas</button>
                </div>

                <div className="flex border-b border-gray-700">
                    <button onClick={() => setInnerTab('characters')} className={`flex-1 py-2 text-sm font-bold ${innerTab === 'characters' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>1. Character Details</button>
                    <button onClick={() => setInnerTab('script')} className={`flex-1 py-2 text-sm font-bold ${innerTab === 'script' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>2. Story Settings</button>
                </div>

                <div className="space-y-6">
                    {innerTab === 'characters' && (
                        <div className="space-y-4 animate-fade-in">
                             <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700 space-y-3">
                                <label className="block text-sm font-semibold text-gray-300">Auto-generate Characters (Smart Thinking)</label>
                                
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Visual Style</label>
                                    <select 
                                        value={characterStyle} 
                                        onChange={(e) => setCharacterStyle(e.target.value)} 
                                        className={`${inputFieldClasses} mb-3`}
                                    >
                                        {styles.map(s => <option key={s.name} value={s.value}>{s.name}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Paste Prompt for Characters (Optional)</label>
                                    <textarea 
                                        value={characterPrompt} 
                                        onChange={(e) => setCharacterPrompt(e.target.value)} 
                                        placeholder="e.g., Create a friendly alien with blue skin and a robotic pet."
                                        className={`${inputFieldClasses} h-20 resize-y mb-3`}
                                    />
                                </div>

                                <div className="flex items-center gap-3">
                                    <input type="number" value={aiCharacterCount} onChange={(e) => setAiCharacterCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))} className={`${inputFieldClasses} w-20`} min="1" max="5" />
                                    <button onClick={handleAiSuggestCharacters} disabled={isGeneratingCharacters || (!topic.trim() && !pastedStory.trim() && !characterPrompt.trim())} className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg shadow-md hover:from-teal-600 hover:to-cyan-600 transition disabled:opacity-50">
                                      {isGeneratingCharacters ? 'Generating...' : 'Generate with AI'}
                                    </button>
                                </div>
                                 <p className="text-xs text-gray-500">Provide a story topic/script OR paste a specific character prompt above.</p>
                            </div>
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
                                            <button onClick={() => removeCharacter(char.id)} disabled={characters.length <= 1} className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30 transition">
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
                    )}
                    {innerTab === 'script' && (
                         <div className="space-y-6 animate-fade-in">
                            {mode === 'ideas' && (
                                <>
                                    <div>
                                        <label htmlFor="storyType" className="block text-sm font-semibold mb-2 text-gray-300">Story Theme for Kids</label>
                                        <input type="text" id="storyType" value={storyType} onChange={(e) => setStoryType(e.target.value)} placeholder="e.g., Friendship, Adventure, Space, Magic" className={inputFieldClasses} />
                                    </div>
                                    <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="smartThinkingIdeas" type="checkbox" checked={smartThinking} onChange={(e) => setSmartThinking(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-600"/></div><div className="ml-3 text-sm"><label htmlFor="smartThinkingIdeas" className="font-medium text-gray-300">Enable Smart Thinking</label></div></div>
                                    <button onClick={handleGenerateIdeas} disabled={isGeneratingIdeas || !storyType.trim()} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-teal-700 hover:from-teal-600 hover:to-cyan-600 transform transition disabled:opacity-50">
                                        {isGeneratingIdeas ? 'Generating Ideas...' : 'Generate 5 Story Ideas'}
                                    </button>
                                    {storyIdeas && (
                                        <div className="border-t border-gray-700 pt-4 mt-4 space-y-4"><h2 className="text-xl font-semibold text-white">Generated Ideas</h2><ol className="list-decimal list-inside space-y-4">
                                            {storyIdeas.map((idea, index) => (<li key={index} className="text-gray-300 bg-gray-800 p-4 rounded-lg"><strong className="text-white font-semibold text-lg">{idea.title}</strong><p className="mt-2 ml-2 text-gray-400">{idea.summary}</p><button onClick={() => handleUseIdea(idea.summary)} className="mt-3 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 rounded-lg shadow-md hover:bg-purple-700 transition">Use This Story</button></li>))}
                                        </ol></div>
                                    )}
                                </>
                            )}
                            {mode === 'new' && (
                                <>
                                    <div><label htmlFor="topic" className="block text-sm font-semibold mb-2 text-gray-300">Story Topic</label><textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., A brave knight searching for a lost dragon" className={`${inputFieldClasses} h-24 resize-none`}/></div>
                                    <div><label className="block text-sm font-semibold mb-2 text-gray-300">Gender Focus (Optional)</label><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{genderFocusOptions.map(option => (<button key={option} onClick={() => setGenderFocus(option === 'Any' ? '' : option)} className={`px-3 py-2 text-xs md:text-sm font-semibold rounded-md transition w-full ${genderFocus === (option === 'Any' ? '' : option) ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{option}</button>))}</div></div>
                                </>
                            )}
                             {mode === 'paste' && (
                                <>
                                    <div><label htmlFor="pastedStory" className="block text-sm font-semibold mb-2 text-gray-300">Paste Your Script</label><textarea id="pastedStory" value={pastedStory} onChange={(e) => setPastedStory(e.target.value)} placeholder="Paste your full story or script here..." className={`${inputFieldClasses} h-48 resize-y`} disabled={analysisComplete || isAnalyzing}/></div>
                                    {!analysisComplete && (<button onClick={handleAnalyze} disabled={isAnalyzing || !pastedStory.trim()} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg shadow-lg border-b-4 border-cyan-700 hover:from-cyan-600 hover:to-blue-600 transform transition disabled:opacity-50">{isAnalyzing ? 'Analyzing...' : 'Analyze Script & Find Characters'}</button>)}
                                </>
                            )}
                            {(mode === 'new' || analysisComplete) && (
                                <div className="space-y-6 border-t border-gray-700 pt-6">
                                    <div className="relative flex items-start"><div className="flex h-6 items-center"><input id="smartThinking" type="checkbox" checked={smartThinking} onChange={(e) => setSmartThinking(e.target.checked)} className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-600"/></div><div className="ml-3 text-sm"><label htmlFor="smartThinking" className="font-medium text-gray-300">Enable Smart Thinking</label><p className="text-gray-400">Generates a more detailed plot.</p></div></div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold mb-2 text-gray-300">Style</label>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {styles.map(s => (
                                                    <button 
                                                        key={s.name} 
                                                        onClick={() => setStyle(s.value)} 
                                                        className={`flex items-center justify-center text-center h-20 p-2 text-xs font-semibold rounded-lg transition w-full transform ${style === s.value ? 'bg-purple-500 text-white scale-105 shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:scale-95'}`}
                                                    >
                                                        {s.name}
                                                    </button>
                                                ))}
                                            </div>
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
                                            <p className="mt-2 text-xs text-gray-400">Max 100.</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                         </div>
                    )}
                </div>

                <div className="pt-6 border-t border-gray-700">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || isAnalyzing || !isReadyToSubmit}
                        className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? 'Generating Story...' : <><span className="text-xl mr-2">✍️</span><span>Generate Story Scenes</span></>}
                    </button>
                </div>
            </div>
            
            <div className="w-full">
                {error && (
                    <div className="mb-4 p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                        {error}
                    </div>
                )}
                <StoryPanel
                    story={story}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};

export default StoryGenerator;
