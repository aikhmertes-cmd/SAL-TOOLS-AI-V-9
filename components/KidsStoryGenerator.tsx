import React, { useState, useCallback, useEffect, useRef } from 'react';
import { 
    generateLyrics, LyricsResponse, generateVoiceover, generateScenesFromLyrics, LyricScene, 
    generateKidsCharacters, generateCharacters, Character as ServiceCharacter,
    generateSimpleStory, SimpleStoryResponse, generateVlogScript, VlogScriptResponse
} from '../services/geminiService.ts';
import type { PrebuiltVoice } from '../services/geminiService.ts';
import StyleSelector from './StyleSelector.tsx';
import { styles } from './styles.ts';
import StoryGenerator from './StoryGenerator.tsx';
import MovieTrailerGenerator from './MovieTrailerGenerator.tsx';
import ImagePanel from './ImagePanel.tsx';
import IdeaGenerator from './IdeaGenerator.tsx';


// --- Audio Utilities ---
const decode = (base64: string): Uint8Array => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
};

const pcmToWavBlob = (pcmData: Int16Array, numChannels: number, sampleRate: number, bitsPerSample: number): Blob => {
    const dataSize = pcmData.length * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    // RIFF chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Sub-chunk size (16 for PCM)
    view.setUint16(20, 1, true); // Audio format (1 for PCM)
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    view.setUint32(28, byteRate, true);
    const blockAlign = numChannels * (bitsPerSample / 8);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);
    
    // Write PCM data
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
};


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

const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h8M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
    </svg>
);

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

const Spinner: React.FC<{className?: string}> = ({className}) => (
    <svg className={`animate-spin h-5 w-5 ${className ?? 'mr-3'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const SongAndStoryGenerator: React.FC = () => {
    type InnerTab = 'details' | 'characters';
    const [innerTab, setInnerTab] = useState<InnerTab>('details');
    type Audience = 'kids' | 'adults';
    const [audience, setAudience] = useState<Audience>('kids');
    type Mode = 'song' | 'story';
    const [mode, setMode] = useState<Mode>('song');
    const [useImage, setUseImage] = useState(false);
    const [imageFile, setImageFile] = useState<{ base64: string, mimeType: string } | null>(null);

    interface Character {
        id: number;
        name: string;
        gender: string;
        age: string;
        description: string;
    }

    const [characters, setCharacters] = useState<Character[]>([
        { id: Date.now(), name: 'Leo the Lion', gender: 'Male', age: 'young cub', description: 'A brave but sometimes clumsy lion cub who dreams of being a king.' }
    ]);
    const [aiCharacterCount, setAiCharacterCount] = useState(2);
    const [characterGenerationStyle, setCharacterGenerationStyle] = useState(styles[4].value); // Default to Pixar 3D

    const [topic, setTopic] = useState('');
    const [creativeContent, setCreativeContent] = useState<{title: string, content: string} | null>(null);
    const [scenes, setScenes] = useState<LyricScene[] | null>(null);
    const [style, setStyle] = useState(styles[1].value); // Default to Anime
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
    const [isGeneratingScenes, setIsGeneratingScenes] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedItem, setCopiedItem] = useState<'content' | 'prompt' | null>(null);
    const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);
    const [copiedCharacterId, setCopiedCharacterId] = useState<number | null>(null);
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [audioError, setAudioError] = useState<string | null>(null);
    const isCancelledRef = useRef(false);

    const inputFieldClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";

    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64String = reader.result as string;
            setImageFile({
                base64: base64String.split(',')[1],
                mimeType: file.type
            });
          };
          reader.onerror = () => {
            setError('Failed to read the image file.');
          };
          reader.readAsDataURL(file);
        }
    };
    
    const addCharacter = () => setCharacters([...characters, { id: Date.now(), name: '', gender: 'Female', age: 'child', description: '' }]);
    const removeCharacter = (id: number) => setCharacters(characters.filter(char => char.id !== id));
    const updateCharacter = (id: number, field: keyof Omit<Character, 'id'>, value: string) => setCharacters(characters.map(char => char.id === id ? { ...char, [field]: value } : char));
    
    const handleAiSuggestCharacters = useCallback(async () => {
        if (!topic.trim()) {
            setError('Please provide a topic in the "Details" tab before generating characters.');
            setInnerTab('details');
            return;
        }
        setIsGeneratingCharacters(true);
        setError(null);
        try {
            const promptTopic = `${topic}. Visual Style: ${characterGenerationStyle}`;
            const generated = await generateCharacters(promptTopic, aiCharacterCount);
            setCharacters(generated.map(c => ({...c, id: Math.random()})));
        } catch (err) {
             setError(err instanceof Error ? err.message : 'Failed to generate characters.');
        } finally {
            setIsGeneratingCharacters(false);
        }
    }, [topic, aiCharacterCount, characterGenerationStyle]);

    const handleCopyCharacterPrompt = (char: Character) => {
        const prompt = `Character Name: ${char.name}\nGender: ${char.gender}\nAge: ${char.age}\nDescription: ${char.description}\nVisual Style: ${characterGenerationStyle}`;
        navigator.clipboard.writeText(prompt);
        setCopiedCharacterId(char.id);
        setTimeout(() => setCopiedCharacterId(null), 2000);
    };

    const handleClear = () => {
        setTopic('');
        setCharacters([{ id: Date.now(), name: 'Leo the Lion', gender: 'Male', age: 'young cub', description: 'A brave but sometimes clumsy lion cub who dreams of being a king.' }]);
        setCreativeContent(null);
        setScenes(null);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setAudioError(null);
        setUseImage(false);
        setImageFile(null);
        setCharacterGenerationStyle(styles[4].value);
    }

    const handleCopy = (text: string, index?: number) => {
        navigator.clipboard.writeText(text);
        if (index !== undefined) {
            setCopiedItem('prompt');
            setCopiedPromptIndex(index);
        } else {
            setCopiedItem('content');
        }
        setTimeout(() => {
            setCopiedItem(null);
            setCopiedPromptIndex(null);
        }, 2000);
    };

    const handleCancel = () => {
        isCancelledRef.current = true;
        setIsLoading(false);
        setError(null);
    };

    const handleSubmit = useCallback(async () => {
        setError(null);
        setScenes(null);
        
        if (!topic.trim()) {
            setError(`Please enter a ${mode} topic.`);
            return;
        }

        setIsLoading(true);
        setCreativeContent(null);
        isCancelledRef.current = false;

        try {
            let charactersForGeneration: ServiceCharacter[];
            if (audience === 'kids') {
                charactersForGeneration = await generateKidsCharacters(topic);
            } else {
                const finalCharacters: ServiceCharacter[] = characters.filter(c => c.name.trim() && c.description.trim()).map(({ id, ...rest }) => rest);
                if (finalCharacters.length === 0) {
                    setError('Please define at least one character with a name and description.');
                    setIsLoading(false);
                    return;
                }
                charactersForGeneration = finalCharacters;
            }

            if (isCancelledRef.current) return;

            if (mode === 'story') {
                const imagePayload = useImage && imageFile ? { base64: imageFile.base64, mimeType: imageFile.mimeType } : undefined;
                const result = await generateSimpleStory({ topic, characters: charactersForGeneration, image: imagePayload });
                 if (isCancelledRef.current) return;
                setCreativeContent({ title: result.storyTitle, content: result.storyContent });
            } else { // song mode
                const result = await generateLyrics({ topic, characters: charactersForGeneration, audience });
                if (isCancelledRef.current) return;
                setCreativeContent({ title: result.songTitle, content: result.songLyrics });
            }

        } catch (err) {
            if (isCancelledRef.current) return;
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            if (isCancelledRef.current) return;
            setIsLoading(false);
        }
    }, [topic, characters, audience, mode, useImage, imageFile]);
    
    const handleGenerateScenes = useCallback(async () => {
        if (!creativeContent?.content) return;
        setIsGeneratingScenes(true);
        setError(null);
        setScenes(null);

        try {
            const result = await generateScenesFromLyrics(creativeContent.content, style);
            setScenes(result);
        } catch (err) {
            setError(err instanceof Error ? `Scene Generation Failed: ${err.message}` : 'An unknown error occurred while generating scenes.');
        } finally {
            setIsGeneratingScenes(false);
        }
    }, [creativeContent, style]);

    const handleGenerateAudio = useCallback(async () => {
        if (!creativeContent?.content) return;

        setIsGeneratingAudio(true);
        setAudioError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            const voice: PrebuiltVoice = audience === 'kids' ? 'Zephyr' : 'Kore';
            const emotion = audience === 'kids' ? 'in a happy, sing-song voice for a child' : 'in a clear, melodic tone';
            const base64Audio = await generateVoiceover(creativeContent.content, 'en', voice, emotion);
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);

        } catch (err) {
            setAudioError(err instanceof Error ? err.message : 'An unknown error occurred while generating the audio.');
        } finally {
            setIsGeneratingAudio(false);
        }
    }, [creativeContent?.content, audioUrl, audience]);
    
    const renderContent = (content: string) => {
        if (!content) return null;
        if (mode === 'story') {
            return content.split('\n').filter(p => p.trim()).map((paragraph, index) => (
                <p key={index} className="text-gray-100 leading-relaxed text-base my-4 font-sans">{paragraph}</p>
            ));
        }
        // Fallback to lyric rendering
        return content.split('\n').map((line, index) => {
            const trimmedLine = line.trim();
            if (/^\(.*\)$/.test(trimmedLine)) return <p key={index} className="font-sans italic text-gray-400 text-base mb-6">{trimmedLine}</p>;
            if (/^\[.*\]$/.test(trimmedLine)) return <p key={index} className="font-sans font-bold text-gray-200 mt-8 mb-3 text-lg">{trimmedLine}</p>;
            if (trimmedLine === '') return <div key={index} className="h-2"></div>;
            return <p key={index} className="text-gray-100 leading-relaxed text-base my-2 font-sans">{trimmedLine}</p>;
        });
    };
    
    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Song & Story Creator</h2>
                    <p className="text-gray-400 mt-1">Create lyrics or short stories for any audience.</p>
                </div>

                <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
                    <button onClick={() => setAudience('kids')} className={`w-full py-2 text-sm font-semibold rounded-md transition ${audience === 'kids' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>For Kids</button>
                    <button onClick={() => setAudience('adults')} className={`w-full py-2 text-sm font-semibold rounded-md transition ${audience === 'adults' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>For Adults</button>
                </div>

                <div className="flex border-b border-gray-700 mb-6">
                    <button onClick={() => setInnerTab('details')} className={`flex-1 py-2 text-sm font-bold ${innerTab === 'details' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>1. Details</button>
                    <button onClick={() => setInnerTab('characters')} className={`flex-1 py-2 text-sm font-bold ${innerTab === 'characters' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400'}`}>2. Characters</button>
                </div>
                
                {innerTab === 'details' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-lg">
                            <button onClick={() => setMode('song')} className={`w-full py-2 text-sm font-semibold rounded-md transition ${mode === 'song' ? 'bg-indigo-500 text-white' : 'text-gray-300'}`}>Song Lyrics</button>
                            <button onClick={() => setMode('story')} className={`w-full py-2 text-sm font-semibold rounded-md transition ${mode === 'story' ? 'bg-indigo-500 text-white' : 'text-gray-300'}`}>Short Story</button>
                        </div>
                        <div>
                            <label htmlFor="topic" className="block text-sm font-semibold mb-2 text-gray-300">{`What should the ${mode} be about?`}</label>
                            <textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder={audience === 'kids' ? "e.g., A song about sharing toys" : "e.g., A story about nostalgia"} className={`${inputFieldClasses} h-24 resize-none`}/>
                        </div>
                        {mode === 'story' && (
                            <div className="space-y-4">
                                <label htmlFor="useImage" className="flex items-center p-3 rounded-lg bg-gray-700/50 hover:bg-gray-700 cursor-pointer transition-colors">
                                    <input 
                                        id="useImage" 
                                        type="checkbox" 
                                        checked={useImage} 
                                        onChange={e => setUseImage(e.target.checked)} 
                                        className="h-5 w-5 rounded border-gray-500 bg-gray-600 text-purple-500 focus:ring-purple-500 focus:ring-offset-gray-800"
                                    />
                                    <span className="ml-3 font-medium text-gray-200">✅ Use Image to Inspire Story</span>
                                </label>
                                {useImage && (
                                    <div className="h-64"><ImagePanel title="Inspiration Image" imageDataUrl={imageFile ? `data:${imageFile.mimeType};base64,${imageFile.base64}`: null} onFileChange={handleFileChange} /></div>
                                )}
                            </div>
                        )}
                    </div>
                )}
                
                {innerTab === 'characters' && (
                    <div className="space-y-4 animate-fade-in">
                        {audience === 'adults' ? (
                            <>
                                <div className="p-4 rounded-lg bg-gray-900/50 border border-gray-700 space-y-3">
                                    <label className="block text-sm font-semibold text-gray-300">Auto-generate Characters</label>
                                    <div>
                                        <label className="block text-xs font-medium text-gray-400 mb-1">Style</label>
                                        <select 
                                            value={characterGenerationStyle} 
                                            onChange={(e) => setCharacterGenerationStyle(e.target.value)} 
                                            className={`${inputFieldClasses} mb-3`}
                                        >
                                            {styles.map(s => <option key={s.name} value={s.value}>{s.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <input type="number" value={aiCharacterCount} onChange={(e) => setAiCharacterCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))} className={`${inputFieldClasses} w-20`} min="1" max="5" />
                                        <button onClick={handleAiSuggestCharacters} disabled={isGeneratingCharacters || !topic.trim()} className="flex-1 flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg shadow-md hover:from-teal-600 hover:to-cyan-600 transition disabled:opacity-50">
                                          {isGeneratingCharacters ? 'Generating...' : 'Generate with AI'}
                                        </button>
                                    </div>
                                     <p className="text-xs text-gray-500">Requires a story topic in the "Details" tab.</p>
                                </div>
                                {characters.map((char, index) => (
                                    <div key={char.id} className="p-4 rounded-lg bg-gray-800 border border-gray-700 relative space-y-3">
                                        <div className="flex justify-between items-center">
                                            <h3 className="font-semibold text-cyan-400">Character {index + 1}</h3>
                                            <button 
                                                onClick={() => handleCopyCharacterPrompt(char)} 
                                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-gray-700 hover:bg-gray-600 rounded transition"
                                            >
                                                <CopyIcon className="h-3 w-3"/>
                                                {copiedCharacterId === char.id ? 'Copied!' : 'Copy Prompt'}
                                            </button>
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
                                        <textarea placeholder="Description..." value={char.description} onChange={(e) => updateCharacter(char.id, 'description', e.target.value)} className={`${inputFieldClasses} h-24 resize-y`} />
                                        <button onClick={() => removeCharacter(char.id)} disabled={characters.length <= 1} className="absolute top-12 right-2 p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30 transition">
                                            <TrashIcon />
                                        </button>
                                    </div>
                                ))}
                                <button onClick={addCharacter} className="flex items-center text-sm font-semibold text-cyan-400 hover:text-cyan-300 transition">
                                    <PlusIcon /> Add Character
                                </button>
                            </>
                        ) : (
                            <div className="text-center p-4 bg-gray-900 rounded-lg">
                                <p className="text-gray-400">Characters are auto-generated for kids' mode to ensure they are simple and fun!</p>
                            </div>
                        )}
                    </div>
                )}

                <div className="pt-6 border-t border-gray-700">
                    {isLoading ? (
                        <button onClick={handleCancel} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-red-600 rounded-lg shadow-lg hover:bg-red-700">Cancel Generation</button>
                     ) : (
                        <button onClick={handleSubmit} disabled={!topic.trim()} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 disabled:opacity-50">
                           <span className="text-xl mr-2">{mode === 'song' ? '🎵' : '📖'}</span><span>{mode === 'song' ? 'Generate Lyrics' : 'Create Story'}</span>
                        </button>
                    )}
                </div>
            </div>
            
            <div className="w-full h-full">
                {error && <div className="mb-4 p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">{error}</div>}
                <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-full">
                    <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                        <h2 className="text-lg font-semibold text-gray-300">Generated Content</h2>
                        {creativeContent && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleCopy(creativeContent.content)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-gray-600 rounded-md shadow-sm hover:bg-gray-500 transition">
                                    <CopyIcon/> {copiedItem === 'content' ? 'Copied!' : 'Copy'}
                                </button>
                                <button onClick={handleGenerateAudio} disabled={isGeneratingAudio} className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold text-white bg-teal-600 rounded-md shadow-sm hover:bg-teal-500 transition disabled:opacity-50">
                                    {isGeneratingAudio ? <Spinner/> : '🔊'} {isGeneratingAudio ? 'Generating...' : 'Generate Audio'}
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="flex-grow bg-gray-900 rounded-md p-6 relative overflow-y-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full"><Spinner/> <span className="ml-2">Generating...</span></div>
                        ) : creativeContent ? (
                            <div>
                                <h3 className="text-2xl font-bold text-cyan-300 mb-4">{creativeContent.title}</h3>
                                {renderContent(creativeContent.content)}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-gray-500">Your generated content will appear here.</div>
                        )}
                    </div>
                    {audioError && <p className="mt-2 text-xs text-red-400 text-center">{audioError}</p>}
                    {audioUrl && (
                         <div className="mt-4"><audio controls src={audioUrl} className="w-full"/></div>
                    )}
                </div>
                {creativeContent && (
                    <div className="mt-8">
                        <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700">
                             <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                                <h2 className="text-lg font-semibold text-gray-300">Image Prompt Scenes</h2>
                                 <div className="flex items-center gap-4">
                                    <div className="w-64"><StyleSelector styles={styles} onSelectStyle={(styleValue) => setStyle(styleValue)} isLoading={isGeneratingScenes} /></div>
                                    <button onClick={handleGenerateScenes} disabled={isGeneratingScenes} className="px-4 py-2 font-semibold text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-500 disabled:opacity-50 transition">
                                        {isGeneratingScenes ? <Spinner/> : '🖼️'} {isGeneratingScenes ? 'Generating...' : 'Generate Scenes'}
                                    </button>
                                </div>
                            </div>
                             <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2">
                                {isGeneratingScenes && <div className="flex items-center justify-center p-8"><Spinner/> <span className="ml-2">Generating scenes...</span></div>}
                                {scenes && scenes.map((scene, index) => (
                                    <div key={scene.scene_number} className="flex items-start justify-between gap-4 bg-gray-900 p-4 rounded-lg border border-gray-700">
                                        <p className="text-gray-300 text-sm flex-grow"><strong className="text-cyan-400 mr-2">Scene {scene.scene_number}: {scene.title}</strong><br/>{scene.prompt}</p>
                                        <button onClick={() => handleCopy(scene.prompt, index)} className="p-2 text-gray-400 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-white transition">
                                            {copiedItem === 'prompt' && copiedPromptIndex === index ? 'Copied!' : <CopyIcon/>}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
};

const VlogGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [vlogStyle, setVlogStyle] = useState('Daily Vlog');
    const [generatedVlog, setGeneratedVlog] = useState<VlogScriptResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [copiedItem, setCopiedItem] = useState<'title' | 'desc' | 'script' | null>(null);

    const vlogStyles = [
        { name: 'Mukbang', emoji: '🍔' },
        { name: 'Daily Vlog', emoji: '📸' },
        { name: 'Travel Vlog', emoji: '✈️' },
        { name: 'Tech Review', emoji: '💻' },
        { name: 'Tutorial / How-To', emoji: '💡' },
    ];

    const handleClear = () => {
        setTopic('');
        setVlogStyle('Daily Vlog');
        setGeneratedVlog(null);
        setError(null);
    };

    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            setError('Please enter a topic for your vlog.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedVlog(null);

        try {
            const result = await generateVlogScript(topic, vlogStyle);
            setGeneratedVlog(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [topic, vlogStyle]);

    const handleCopy = (item: 'title' | 'desc' | 'script', text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedItem(item);
        setTimeout(() => setCopiedItem(null), 2000);
    };

    const renderVlogScript = (script: string) => {
        return script.split('\n').map((line, index) => {
            const trimmedLine = line.trim();
            if (/^\[.*\]$/.test(trimmedLine)) {
                return <p key={index} className="font-sans font-bold text-cyan-400 mt-6 mb-2 text-base">{trimmedLine}</p>;
            }
            if (trimmedLine === '') return <div key={index} className="h-2"></div>;
            return <p key={index} className="text-gray-300 leading-relaxed text-sm my-1 font-sans">{trimmedLine}</p>;
        });
    };

    const inputFieldClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";

    return (
        <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Controls */}
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                <ClearProjectButton onClick={handleClear} />
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Vlog Script Generator</h2>
                    <p className="text-gray-400 mt-1">Quickly generate a title, description, and script for your next video.</p>
                </div>

                <div>
                    <label htmlFor="vlog-topic" className="block text-sm font-semibold mb-2 text-gray-300">Vlog Topic</label>
                    <textarea id="vlog-topic" value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g., A day in my life as a software engineer" className={`${inputFieldClasses} h-28 resize-y`} />
                </div>
                
                <div>
                    <label className="block text-sm font-semibold mb-2 text-gray-300">Vlog Style</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {vlogStyles.map(style => (
                             <button 
                                key={style.name} 
                                onClick={() => setVlogStyle(style.name)} 
                                className={`flex flex-col items-center justify-center text-center h-24 p-2 text-sm font-semibold rounded-lg transition w-full transform ${vlogStyle === style.name ? 'bg-purple-500 text-white scale-105 shadow-lg' : 'bg-gray-700 text-gray-300 hover:bg-gray-600 active:scale-95'}`}>
                                <span className="text-3xl mb-1">{style.emoji}</span>
                                {style.name}
                            </button>
                        ))}
                    </div>
                </div>

                 <div className="pt-6 border-t border-gray-700">
                     <button onClick={handleGenerate} disabled={isLoading || !topic.trim()} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 disabled:opacity-50">
                        {isLoading ? <Spinner className="mr-2"/> : <span className="text-xl mr-2">✍️</span>}
                        {isLoading ? 'Generating Script...' : 'Generate Vlog Script'}
                    </button>
                </div>
            </div>

            {/* Output */}
            <div className="w-full">
                {error && <div className="mb-4 p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">{error}</div>}
                 <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 min-h-[70vh]">
                     <div className="flex-grow bg-gray-900 rounded-md p-4 relative overflow-y-auto">
                        {isLoading ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-md">
                                <Spinner className="h-8 w-8 text-cyan-400" />
                                <span className="ml-3 text-white">Crafting your vlog...</span>
                            </div>
                        ) : generatedVlog ? (
                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-bold text-gray-200">YouTube Title</h3>
                                        <button onClick={() => handleCopy('title', generatedVlog.youtubeTitle)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-500">
                                           <CopyIcon className="h-4 w-4" /> {copiedItem === 'title' ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="p-3 bg-gray-800 rounded-md text-cyan-300 font-semibold">{generatedVlog.youtubeTitle}</p>
                                </div>
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-bold text-gray-200">YouTube Description</h3>
                                        <button onClick={() => handleCopy('desc', generatedVlog.youtubeDescription)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-500">
                                            <CopyIcon className="h-4 w-4" /> {copiedItem === 'desc' ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <p className="p-3 bg-gray-800 rounded-md text-gray-300 text-sm whitespace-pre-wrap">{generatedVlog.youtubeDescription}</p>
                                </div>
                                <div>
                                     <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-lg font-bold text-gray-200">Vlog Script</h3>
                                         <button onClick={() => handleCopy('script', generatedVlog.vlogScript)} className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-gray-600 rounded-md hover:bg-gray-500">
                                            <CopyIcon className="h-4 w-4" /> {copiedItem === 'script' ? 'Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <div className="p-4 bg-gray-800 rounded-md">{renderVlogScript(generatedVlog.vlogScript)}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center">
                                <span className="text-4xl mb-2">🤳</span>
                                <p>Your generated vlog script will appear here.</p>
                            </div>
                        )}
                     </div>
                </div>
            </div>
        </div>
    );
};


const KidsStoryGenerator: React.FC = () => {
    type Tab = 'idea_generator' | 'song_story' | 'full_story' | 'movie_trailer' | 'vlog_video';
    const [activeTab, setActiveTab] = useState<Tab>('idea_generator');

    const getTabClass = (tabName: Tab) => {
        const base = "px-4 py-2 font-semibold rounded-md transition-colors duration-200 text-sm";
        if (activeTab === tabName) {
            return `${base} bg-cyan-600 text-white`;
        }
        return `${base} bg-gray-700 text-gray-300 hover:bg-gray-600`;
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col">
            <div className="mb-6 flex flex-wrap justify-center gap-2 p-2 bg-gray-800 rounded-lg border border-gray-700">
                <button onClick={() => setActiveTab('idea_generator')} className={getTabClass('idea_generator')}>
                    💡 Idea Generator
                </button>
                <button onClick={() => setActiveTab('song_story')} className={getTabClass('song_story')}>
                    🎶 Song & Short Story
                </button>
                <button onClick={() => setActiveTab('full_story')} className={getTabClass('full_story')}>
                    📖 Story Script
                </button>
                <button onClick={() => setActiveTab('movie_trailer')} className={getTabClass('movie_trailer')}>
                    🎟️ Movie Trailer
                </button>
                 <button onClick={() => setActiveTab('vlog_video')} className={getTabClass('vlog_video')}>
                    🤳 Vlog Video
                </button>
            </div>
    
            <div className="relative">
                <div style={{ display: activeTab === 'idea_generator' ? 'block' : 'none' }}><IdeaGenerator /></div>
                <div style={{ display: activeTab === 'song_story' ? 'block' : 'none' }}><SongAndStoryGenerator /></div>
                <div style={{ display: activeTab === 'full_story' ? 'block' : 'none' }}><StoryGenerator /></div>
                <div style={{ display: activeTab === 'movie_trailer' ? 'block' : 'none' }}><MovieTrailerGenerator /></div>
                <div style={{ display: activeTab === 'vlog_video' ? 'block' : 'none' }}><VlogGenerator /></div>
            </div>
        </div>
    );
}


export default KidsStoryGenerator;