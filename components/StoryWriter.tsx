import React, { useState, useCallback, useRef, useEffect } from 'react';
import { assistWriting, generateVoiceover, generateImageForScene, extendStoryWithImage } from '../services/geminiService.ts';

type StoryGenre = 'Fantasy' | 'Sci-Fi' | 'Mystery' | 'Romance' | 'Historical' | 'Non-Fiction';
type StoryTone = 'Suspenseful' | 'Humorous' | 'Dramatic' | 'Formal' | 'Casual' | 'Inspiring';
type PromptLanguage = 'km' | 'en';

interface Scene {
    id: number;
    content: string;
    isEditing?: boolean;
    header?: string;
}

// --- Icons ---
const CopyIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const EditIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg>;
const ImageIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
const VoiceoverIcon: React.FC = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>;
const Spinner: React.FC<{size?: string}> = ({size = 'h-4 w-4'}) => <svg className={`animate-spin ${size}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>;
const DownloadIcon: React.FC<{className?: string}> = ({className = "h-4 w-4"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
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

const defaultPrompts: Record<PromptLanguage, string> = {
    km: 'បន្តសាច់រឿងតាមរបៀបធម្មជាតិ',
    en: 'Continue the story in a natural way'
};

const genreTranslations: Record<StoryGenre, string> = { 'Fantasy': 'រឿងស្រមើស្រមៃ', 'Sci-Fi': 'វិទ្យាសាស្ត្រប្រឌិត', 'Mystery': 'រឿងអាថ៌កំបាំង', 'Romance': 'រឿងស្នេហា', 'Historical': 'ប្រវត្តិសាស្ត្រ', 'Non-Fiction': 'រឿងពិត' };
const toneTranslations: Record<StoryTone, string> = { 'Suspenseful': 'រន្ធត់', 'Humorous': 'កំប្លែង', 'Dramatic': 'មនោសញ្ចេតនា', 'Formal': 'ផ្លូវការ', 'Casual': 'សាមញ្ញ', 'Inspiring': 'បំផុសគំនិត' };

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

const StoryWriter: React.FC = () => {
    const [story, setStory] = useState('');
    const [generatedScenes, setGeneratedScenes] = useState<Scene[]>([]);
    const [promptLanguage, setPromptLanguage] = useState<PromptLanguage>('km');
    const [instruction, setInstruction] = useState(defaultPrompts.km);
    const [genre, setGenre] = useState<StoryGenre>('Fantasy');
    const [tone, setTone] = useState<StoryTone>('Suspenseful');
    const [sceneCount, setSceneCount] = useState<number | ''>(2);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [sceneImages, setSceneImages] = useState<Record<number, { loading: boolean; url: string | null; error: string | null }>>({});
    const [sceneAudios, setSceneAudios] = useState<Record<number, { loading: boolean; url: string | null; error: string | null }>>({});
    const [copiedSceneId, setCopiedSceneId] = useState<number | null>(null);
    const [isAllCopied, setIsAllCopied] = useState(false);
    const [extendingSceneId, setExtendingSceneId] = useState<number | null>(null);

    useEffect(() => {
        return () => {
            // FIX: Explicitly type the `audio` parameter to resolve `Object.values` type inference issue.
            Object.values(sceneAudios).forEach((audio: { loading: boolean; url: string | null; error: string | null }) => {
                if (audio.url) {
                    URL.revokeObjectURL(audio.url);
                }
            });
        };
    }, [sceneAudios]);


    const handlePromptLanguageChange = (lang: PromptLanguage) => {
        setPromptLanguage(lang);
        setInstruction(defaultPrompts[lang]);
    };

    const handleContinue = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        // Combine user text and existing scenes for context
        const fullStoryContext = story + '\n\n' + generatedScenes.map(s => `${s.header}\n${s.content}`).join('\n\n');

        try {
            const result = await assistWriting({
                mode: 'continue',
                story: fullStoryContext.trim(),
                instruction,
                genre,
                tone,
                sceneCount: sceneCount ? Number(sceneCount) : undefined,
            });
            
            // Parse result into scenes
            const sceneRegex = /\n*SCENE\s*(\d+)\n*/i;
            const parts = result.split(sceneRegex);
            const newScenes: Scene[] = [];
            
            // The regex split results in an array like ['', '1', 'Scene 1 content', '2', 'Scene 2 content', ...]
            for (let i = 1; i < parts.length; i += 2) {
                const sceneNumber = parts[i];
                const sceneContent = parts[i+1]?.trim();
                if(sceneContent) {
                    newScenes.push({
                        id: Date.now() + Math.random(),
                        header: `SCENE ${sceneNumber}`,
                        content: sceneContent,
                    });
                }
            }
            
            // If regex fails, add as a single block
            if (newScenes.length === 0 && result.trim()) {
                 newScenes.push({
                    id: Date.now(),
                    header: `GENERATED TEXT`,
                    content: result.trim(),
                });
            }

            // Append new scenes
            if(story.trim()) {
                setGeneratedScenes(prev => [...prev, { id: Date.now(), content: story, header: "USER INPUT" }, ...newScenes]);
                setStory(''); // Clear input textarea
            } else {
                 setGeneratedScenes(prev => [...prev, ...newScenes]);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [story, generatedScenes, instruction, genre, tone, sceneCount]);

    const handleGenerateImage = async (sceneId: number, prompt: string) => {
        setSceneImages(prev => ({ ...prev, [sceneId]: { loading: true, url: null, error: null } }));
        try {
            const imageUrl = await generateImageForScene(prompt);
            setSceneImages(prev => ({ ...prev, [sceneId]: { loading: false, url: imageUrl, error: null } }));
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Image generation failed.';
            setSceneImages(prev => ({ ...prev, [sceneId]: { loading: false, url: null, error: errorMsg } }));
        }
    };

    const handleGenerateVoiceover = async (sceneId: number, text: string) => {
        setSceneAudios(prev => ({ ...prev, [sceneId]: { loading: true, url: null, error: null } }));
        try {
            const base64Audio = await generateVoiceover(text, promptLanguage);
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            // Gemini TTS model returns 24kHz mono audio
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setSceneAudios(prev => ({ ...prev, [sceneId]: { loading: false, url: url, error: null } }));
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Voiceover generation failed.';
            setSceneAudios(prev => ({ ...prev, [sceneId]: { loading: false, url: null, error: errorMsg } }));
        }
    };

    const handleExtendScene = useCallback(async (sceneId: number) => {
        setExtendingSceneId(sceneId);
        setError(null);

        const sceneToExtendIndex = generatedScenes.findIndex(s => s.id === sceneId);
        if (sceneToExtendIndex === -1) {
            setError("Could not find the scene to extend.");
            setExtendingSceneId(null);
            return;
        }

        const imageUrl = sceneImages[sceneId]?.url;
        if (!imageUrl) {
            setError("Image not available for this scene.");
            setExtendingSceneId(null);
            return;
        }
        
        const [header, base64Data] = imageUrl.split(',');
        const mimeTypeMatch = header.match(/:(.*?);/);
        if (!base64Data || !mimeTypeMatch) {
            setError("Invalid image data URL.");
            setExtendingSceneId(null);
            return;
        }
        const mimeType = mimeTypeMatch[1];
        
        const contextScenes = generatedScenes.slice(0, sceneToExtendIndex + 1);
        const storyContext = contextScenes.map(s => `${s.header}\n${s.content}`).join('\n\n');

        try {
            const result = await extendStoryWithImage(storyContext, base64Data, mimeType);
            
            const sceneRegex = /\n*SCENE\s*(\d+)\n*/i;
            const parts = result.split(sceneRegex);
            const newScenes: Scene[] = [];

            for (let i = 1; i < parts.length; i += 2) {
                const sceneNumber = parts[i];
                const sceneContent = parts[i+1]?.trim();
                if(sceneContent) {
                    newScenes.push({
                        id: Date.now() + Math.random(),
                        header: `SCENE ${sceneNumber} (EXTENDED)`,
                        content: sceneContent,
                    });
                }
            }
            
            if (newScenes.length === 0 && result.trim()) {
                 newScenes.push({
                    id: Date.now(),
                    header: `EXTENDED TEXT`,
                    content: result.trim(),
                });
            }
            
            setGeneratedScenes(prev => {
                const newArray = [...prev];
                newArray.splice(sceneToExtendIndex + 1, 0, ...newScenes);
                return newArray;
            });

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred while extending.');
        } finally {
            setExtendingSceneId(null);
        }
    }, [generatedScenes, sceneImages]);

    const handleCopyScene = (sceneId: number, content: string) => {
        navigator.clipboard.writeText(content);
        setCopiedSceneId(sceneId);
        setTimeout(() => setCopiedSceneId(null), 2000);
    };
    
    const toggleEditScene = (sceneId: number) => {
        setGeneratedScenes(scenes => scenes.map(s => s.id === sceneId ? {...s, isEditing: !s.isEditing} : s));
    };

    const handleSceneChange = (sceneId: number, newContent: string) => {
         setGeneratedScenes(scenes => scenes.map(s => s.id === sceneId ? {...s, content: newContent} : s));
    };
    
    const handleClear = () => {
        setStory('');
        setGeneratedScenes([]);
        setInstruction(defaultPrompts[promptLanguage]);
        setError(null);
        setSceneImages({});
        setSceneAudios({});
    };

    const handleCopyAllScenes = () => {
        if (generatedScenes.length === 0) return;
        const allScenesText = generatedScenes.map(s => `${s.header || 'SCENE'}\n${s.content}`).join('\n\n---\n\n');
        navigator.clipboard.writeText(allScenesText);
        setIsAllCopied(true);
        setTimeout(() => setIsAllCopied(false), 2000);
    };

    const handleDownloadAll = () => {
        if (generatedScenes.length === 0) return;
        const allScenesText = generatedScenes.map(s => `${s.header || 'SCENE'}\n${s.content}`).join('\n\n----------------------------------------\n\n');
        const blob = new Blob([allScenesText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `story-writer-scenes-${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const renderSelector = <T extends string>(label: string, options: T[], translations: Record<T, string>, currentValue: T, setter: (value: T) => void) => (
        <div>
            <label className="block text-sm font-semibold mb-2 text-gray-300">{label}</label>
            <div className="flex flex-wrap gap-2">
                {options.map(option => (
                    <button key={option} onClick={() => setter(option)} disabled={isLoading} className={`px-3 py-1.5 text-xs sm:text-sm font-semibold rounded-md transition w-auto disabled:opacity-50 ${currentValue === option ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                        {translations[option]}
                    </button>
                ))}
            </div>
        </div>
    );
    
    return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
        <ClearProjectButton onClick={handleClear} />
        <div className="w-full bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Tools+Ai បង្កើតរឿង</h2>
                <p className="text-gray-400 mt-2">សរសេរ និពន្ធ និងបង្កើតរូបភាព។</p>
            </div>

            {generatedScenes.length > 0 && (
                <div className="flex justify-center gap-4 my-4 p-2 bg-gray-900/50 rounded-lg border border-gray-700">
                    <button
                        onClick={handleCopyAllScenes}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-500 transition"
                    >
                        <CopyIcon />
                        {isAllCopied ? 'Copied!' : 'Copy all Scenes'}
                    </button>
                    <button
                        onClick={handleDownloadAll}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg shadow-md hover:bg-emerald-500 transition"
                    >
                        <DownloadIcon />
                        Downloads all
                    </button>
                </div>
            )}

            <div className="space-y-2 max-h-[40vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg p-4 font-serif text-gray-200">
                {generatedScenes.map((scene, index) => {
                    const isVoLoading = sceneAudios[scene.id]?.loading;
                    return (
                        <div key={scene.id} className={`p-4 rounded-lg relative ${index % 2 === 0 ? 'bg-gray-800/50' : 'bg-gray-800/20'}`}>
                            <h4 className="font-sans font-bold text-sm text-cyan-400 mb-2">{scene.header}</h4>
                            {scene.isEditing ? (
                                <textarea
                                    value={scene.content}
                                    onChange={(e) => handleSceneChange(scene.id, e.target.value)}
                                    className="w-full bg-gray-700 border border-cyan-500 rounded-md p-2 text-base resize-y"
                                />
                            ) : (
                                <p className="whitespace-pre-wrap leading-relaxed">{scene.content}</p>
                            )}
                            
                            <div className="absolute top-2 right-2 flex items-center gap-2 bg-gray-900/50 p-1 rounded-md">
                                {scene.isEditing ? (
                                    <button onClick={() => toggleEditScene(scene.id)} className="px-3 py-1 text-xs font-semibold bg-emerald-600 rounded-md hover:bg-emerald-500">Save</button>
                                ) : (
                                    <>
                                    <button title="Copy" onClick={() => handleCopyScene(scene.id, scene.content)} className="p-1.5 text-gray-400 hover:text-white transition">{copiedSceneId === scene.id ? <span className="text-xs text-cyan-400 px-1">Copied!</span> : <CopyIcon />}</button>
                                    <button title="Edit" onClick={() => toggleEditScene(scene.id)} className="p-1.5 text-gray-400 hover:text-white transition"><EditIcon /></button>
                                    <button title="Generate Voiceover" onClick={() => handleGenerateVoiceover(scene.id, scene.content)} disabled={isVoLoading} className="p-1.5 text-gray-400 hover:text-white transition disabled:opacity-50">
                                        {isVoLoading ? <Spinner size="h-4 w-4" /> : <VoiceoverIcon />}
                                    </button>
                                    <button title="Generate Image" onClick={() => handleGenerateImage(scene.id, scene.content)} className="p-1.5 text-gray-400 hover:text-white transition"><ImageIcon /></button>
                                    </>
                                )}
                            </div>
                            
                            {sceneImages[scene.id] && (
                                <div className="mt-4 border-t border-gray-700 pt-4">
                                    {sceneImages[scene.id].loading && <div className="flex items-center justify-center h-40 bg-gray-800 rounded-md"><Spinner size="h-8 w-8" /></div>}
                                    {sceneImages[scene.id].error && <p className="text-red-400 text-sm">{sceneImages[scene.id].error}</p>}
                                    {sceneImages[scene.id].url && (
                                        <div className="space-y-4">
                                            <img src={sceneImages[scene.id].url} alt={`Generated for ${scene.header}`} className="rounded-lg w-full" />
                                            {!scene.isEditing && (
                                                <button
                                                    onClick={() => handleExtendScene(scene.id)}
                                                    disabled={extendingSceneId === scene.id}
                                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-md hover:from-purple-600 hover:to-cyan-600 transition-colors duration-200 disabled:opacity-50"
                                                    aria-label="Extend scene using this image as context"
                                                >
                                                    {extendingSceneId === scene.id ? (
                                                        <>
                                                            <Spinner size="h-5 w-5" />
                                                            <span>Extending...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                                                <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                                            </svg>
                                                            <span>Add to scene to Extend</span>
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                             {sceneAudios[scene.id] && !sceneAudios[scene.id].loading && (
                                <div className="mt-4 border-t border-gray-700 pt-4">
                                    {sceneAudios[scene.id].error && <p className="text-red-400 text-sm">{sceneAudios[scene.id].error}</p>}
                                    {sceneAudios[scene.id].url && (
                                        <audio src={sceneAudios[scene.id].url} controls className="w-full h-10" />
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
                 <textarea
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                    placeholder="ចាប់ផ្តើមសរសេរនៅទីនេះ ឬបន្តរឿង..."
                    className="bg-transparent text-gray-200 text-base block w-full p-2 h-24 resize-y outline-none"
                    disabled={isLoading}
                />
            </div>
            
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700 space-y-5">
                <h3 className="text-lg font-semibold text-gray-300 border-b border-gray-600 pb-2">AI Tools</h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                     <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Language for Prompt</label>
                        <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-lg">
                           <button onClick={() => handlePromptLanguageChange('km')} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition ${promptLanguage === 'km' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>Cambodia</button>
                           <button onClick={() => handlePromptLanguageChange('en')} className={`w-full px-3 py-1.5 text-sm font-semibold rounded-md transition ${promptLanguage === 'en' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>English</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="instruction" className="block text-sm font-semibold mb-2 text-gray-300">ការណែនាំ AI</label>
                        <input type="text" id="instruction" value={instruction} onChange={(e) => setInstruction(e.target.value)} className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400" disabled={isLoading}/>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    {renderSelector<StoryGenre>('ប្រភេទរឿង', ['Fantasy', 'Sci-Fi', 'Mystery', 'Romance', 'Historical', 'Non-Fiction'], genreTranslations, genre, setGenre)}
                    {renderSelector<StoryTone>('បរិយាកាស', ['Suspenseful', 'Humorous', 'Dramatic', 'Formal', 'Casual', 'Inspiring'], toneTranslations, tone, setTone)}
                     <div>
                        <label htmlFor="scenes" className="block text-sm font-semibold mb-2 text-gray-300">ចំនួនឈុត</label>
                        <input type="number" id="scenes" value={sceneCount} onChange={(e) => setSceneCount(e.target.value === '' ? '' : parseInt(e.target.value, 10))} placeholder="e.g., 3" className="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400" disabled={isLoading} min="1"/>
                    </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-gray-700">
                    <button onClick={handleContinue} disabled={isLoading} className="w-full flex items-center justify-center px-6 py-2.5 font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-teal-700 hover:from-teal-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 disabled:opacity-50">
                        {isLoading ? <><Spinner /> កំពុងគិត...</> : 'បន្តការសរសេរ'}
                    </button>
                </div>
            </div>
            {error && <div className="mt-4 p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">{error}</div>}
        </div>
    </div>
    );
};

export default StoryWriter;