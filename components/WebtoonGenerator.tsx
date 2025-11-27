import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateWebtoonScript, generateImage, WebtoonPanel, generateCharacters, generateVoiceover } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h8M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
    </svg>
);

const TrashIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const PlusIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
);

const SparklesIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L15 12l-2.293-2.293a1 1 0 010-1.414L15 6m0 0l2.293-2.293a1 1 0 011.414 0L21 6m-6 12l2.293 2.293a1 1 0 001.414 0L21 18m-6-6l-2.293 2.293a1 1 0 000 1.414L15 18" />
    </svg>
);

const PlayIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
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

    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false); // "WAVE"

    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    view.setUint32(28, byteRate, true);
    const blockAlign = numChannels * (bitsPerSample / 8);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);

    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
};

interface Character {
    id: number;
    name: string;
    gender: string;
    age: string;
    description: string;
}

const stylesList = [
    'Manhwa (Korean Webtoon)',
    'Anime',
    'Romance Fantasy (Rofan)',
    'Action/Leveling Manhwa',
    'Black & White Manga',
    'American Comic Book',
    'Watercolor',
    'Pixel Art',
    'Cyberpunk',
    'Noir'
];

const languages = [
    'English', 'Khmer', 'Korean', 'Japanese', 'Chinese', 'French', 'Spanish'
];

const aspectRatios = [
    { value: '3:4', label: '3:4 (Default Webtoon)' },
    { value: '9:16', label: '9:16 (Vertical Mobile)' },
    { value: '16:9', label: '16:9 (Widescreen)' },
    { value: '4:3', label: '4:3 (Classic TV)' },
    { value: '1:1', label: '1:1 (Square)' },
    { value: '21:9', label: '21:9 (Ultra-wide)' },
    { value: '2.35:1', label: '2.35:1 (CinemaScope)' },
    { value: '3:2', label: '3:2 (Photography)' },
    { value: '5:4', label: '5:4 (Portrait)' },
    { value: '2:1', label: '2:1 (Modern Cinematic)' },
    { value: '4:5', label: '4:5 (Instagram Portrait)' }
];

const WebtoonGenerator: React.FC = () => {
    const { t } = useLanguage();
    const [topic, setTopic] = useState('');
    const [style, setStyle] = useState(stylesList[0]);
    const [language, setLanguage] = useState('English');
    const [panelCount, setPanelCount] = useState(4);
    const [startNumber, setStartNumber] = useState(1);
    const [aspectRatio, setAspectRatio] = useState('3:4');
    const [panels, setPanels] = useState<WebtoonPanel[] | null>(null);
    const [panelImages, setPanelImages] = useState<Record<number, string>>({});
    const [isLoadingScript, setIsLoadingScript] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isGeneratingImages, setIsGeneratingImages] = useState(false);
    const [generatingIndex, setGeneratingIndex] = useState<number | null>(null); // Track which panel is being generated
    const [error, setError] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Audio & Copy States
    const [audioUrls, setAudioUrls] = useState<Record<string, { loading: boolean; url: string | null }>>({});
    const [copiedTextIndex, setCopiedTextIndex] = useState<string | null>(null);
    const [copiedAll, setCopiedAll] = useState(false);

    // Character State
    const [characters, setCharacters] = useState<Character[]>([]);
    const [aiCharacterCount, setAiCharacterCount] = useState(2);
    const [isGeneratingCharacters, setIsGeneratingCharacters] = useState(false);
    const [copiedCharacterIndex, setCopiedCharacterIndex] = useState<number | null>(null);

    // Simulate progress update
    useEffect(() => {
        let interval: number;
        if (isLoadingScript) {
            setProgress(0);
            interval = window.setInterval(() => {
                setProgress((prev) => {
                    // Fast initially, then slows down as it approaches 90%
                    const remaining = 95 - prev;
                    if (remaining <= 0) return 95;
                    const increment = Math.max(0.2, remaining * 0.05);
                    return prev + increment;
                });
            }, 150);
        } else {
            setProgress(0);
        }
        return () => clearInterval(interval);
    }, [isLoadingScript]);

    useEffect(() => {
        return () => {
            Object.values(audioUrls).forEach((item: { loading: boolean; url: string | null }) => {
                if (item.url) URL.revokeObjectURL(item.url);
            });
        };
    }, [audioUrls]);

    const generateImagesSequence = useCallback(async (panelsList: WebtoonPanel[], existingImages: Record<number, string>) => {
        setIsGeneratingImages(true);
        setError(null);

        try {
            for (let i = 0; i < panelsList.length; i++) {
                const panel = panelsList[i];
                
                if (existingImages[panel.panelNumber]) {
                    continue;
                }

                setGeneratingIndex(i + 1); // Update progress indicator (1-based)

                // We add the style to the prompt to ensure consistency
                const fullPrompt = `${style} style. ${panel.visualDescription}`;
                
                try {
                    const imageUrl = await generateImage(fullPrompt, aspectRatio); 
                    setPanelImages(prev => ({ ...prev, [panel.panelNumber]: imageUrl }));
                } catch (imgErr) {
                    console.error(`Error generating panel ${panel.panelNumber}:`, imgErr);
                    // Check for quota error
                    const errString = String(imgErr).toLowerCase();
                    if (errString.includes('quota') || errString.includes('429') || errString.includes('resource exhausted')) {
                         setError(`API Quota Limit Reached at Panel ${panel.panelNumber}. Paused. Wait a moment and click 'Resume Generating Art'.`);
                         break; // Stop the loop, keep state so user can resume
                    }
                }

                // Add delay between requests to prevent rate limiting (15000ms = 15 seconds)
                if (i < panelsList.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 15000));
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate all images.');
        } finally {
            setIsGeneratingImages(false);
            setGeneratingIndex(null);
        }
    }, [style, aspectRatio]);

    const handleGenerateScript = useCallback(async () => {
        if (!topic.trim()) {
            setError('Please enter a story topic.');
            return;
        }
        setIsLoadingScript(true);
        setError(null);
        setPanels(null);
        setPanelImages({});

        try {
            const validCharacters = characters.filter(c => c.name.trim() && c.description.trim());
            // Remove ID for API call
            const apiCharacters = validCharacters.map(({ id, ...rest }) => rest);

            const script = await generateWebtoonScript(topic, style, panelCount, language, apiCharacters);
            setProgress(100);
            // Small delay to let user see 100%
            await new Promise(resolve => setTimeout(resolve, 300));
            setPanels(script);
            setIsLoadingScript(false); // Stop script loading before image gen starts

            // Automatically start image generation
            generateImagesSequence(script, {});

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate script.');
            setIsLoadingScript(false);
        }
    }, [topic, style, panelCount, language, characters, generateImagesSequence]);

    const handleGenerateImages = useCallback(async () => {
        if (!panels) return;
        // Resume generation using current panels and images
        generateImagesSequence(panels, panelImages);
    }, [panels, panelImages, generateImagesSequence]);

    const handlePlayAudio = async (panelIndex: number, dialogIndex: number, text: string) => {
        const key = `${panelIndex}-${dialogIndex}`;
        if (audioUrls[key]?.url) {
            new Audio(audioUrls[key].url!).play();
            return;
        }

        setAudioUrls(prev => ({ ...prev, [key]: { loading: true, url: null } }));

        try {
            const base64Audio = await generateVoiceover(text, language);
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            
            setAudioUrls(prev => ({ ...prev, [key]: { loading: false, url } }));
            new Audio(url).play();
        } catch (err) {
            console.error("Audio generation failed", err);
            setAudioUrls(prev => ({ ...prev, [key]: { loading: false, url: null } }));
        }
    };

    const handleCopyText = (text: string, panelIndex: number, dialogIndex: number) => {
        navigator.clipboard.writeText(text);
        const key = `${panelIndex}-${dialogIndex}`;
        setCopiedTextIndex(key);
        setTimeout(() => setCopiedTextIndex(null), 2000);
    };

    const handleCopyAllScript = () => {
        if (!panels) return;
        const fullScript = panels.map(p => {
            const displayNum = p.panelNumber + (startNumber - 1);
            let section = `Part ${displayNum}:\nVisual: ${p.visualDescription}\n`;
            p.dialogue.forEach(d => {
                section += `${d.character}: "${d.text}"\n`;
            });
            return section;
        }).join('\n-------------------\n\n');
        
        navigator.clipboard.writeText(fullScript);
        setCopiedAll(true);
        setTimeout(() => setCopiedAll(false), 2000);
    };

    const handleDownloadEpisode = async () => {
        if (!contentRef.current || !(window as any).html2canvas) return;
        
        try {
            const canvas = await (window as any).html2canvas(contentRef.current, {
                useCORS: true,
                scale: 2,
                backgroundColor: '#ffffff', // Webtoons usually have white background
            });
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `webtoon-full-episode-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Download failed", err);
            alert("Failed to download episode.");
        }
    };

    const handleDownloadPart = async (panelNumber: number) => {
        const element = document.getElementById(`webtoon-part-${panelNumber}`);
        if (!element || !(window as any).html2canvas) return;

        try {
            const canvas = await (window as any).html2canvas(element, {
                useCORS: true,
                scale: 2,
                backgroundColor: '#ffffff',
                ignoreElements: (el: Element) => el.classList.contains('download-overlay')
            });
            const dataUrl = canvas.toDataURL('image/png');
            const displayNum = panelNumber + (startNumber - 1);
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `webtoon-part-${displayNum}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Download part failed", err);
            alert("Failed to download part.");
        }
    };

    const handleClear = () => {
        setTopic('');
        setPanels(null);
        setPanelImages({});
        setError(null);
        setProgress(0);
        setAspectRatio('3:4');
        setCharacters([]);
        setAiCharacterCount(2);
        setAudioUrls({});
        setStartNumber(1);
    };

    // Character Management Functions
    const handleAutoGenerateCharacters = async () => {
        if (!topic.trim()) {
            setError('Please enter a topic first to generate characters.');
            return;
        }
        setIsGeneratingCharacters(true);
        setError(null);
        try {
            const promptWithStyle = `${topic}. Visual Style: ${style}`;
            const generated = await generateCharacters(promptWithStyle, aiCharacterCount);
            setCharacters(generated.map(c => ({...c, id: Math.random()})));
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to auto-generate characters.');
        } finally {
            setIsGeneratingCharacters(false);
        }
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

    const handleCopyCharacter = (char: Character, index: number) => {
        const charText = `Name: ${char.name}\nGender: ${char.gender}\nAge: ${char.age}\nDescription: ${char.description}`;
        navigator.clipboard.writeText(charText);
        setCopiedCharacterIndex(index);
        setTimeout(() => setCopiedCharacterIndex(null), 2000);
    };

    const inputClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";

    const allImagesGenerated = panels && panels.length > 0 && Object.keys(panelImages).length === panels.length;

    return (
        <div className="w-full max-w-4xl mx-auto p-4">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Sidebar: Controls */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-gray-800/50 p-5 rounded-lg border border-gray-700 h-fit sticky top-4">
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-400 mb-4">
                            Webtoon Creator
                        </h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-300">Story Topic</label>
                                <textarea 
                                    value={topic} 
                                    onChange={(e) => setTopic(e.target.value)} 
                                    placeholder="e.g., A high school student discovers a dungeon portal..." 
                                    className={`${inputClasses} h-24 resize-y`}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-300">Style</label>
                                <select value={style} onChange={(e) => setStyle(e.target.value)} className={inputClasses}>
                                    {stylesList.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            {/* Character Generation Section */}
                            <div className="bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                                <div className="flex flex-col gap-3 mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-lg">🎭</span>
                                            <label className="font-semibold text-gray-200 text-sm">Characters</label>
                                        </div>
                                        <button onClick={addCharacter} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center">
                                            <PlusIcon /> Add
                                        </button>
                                    </div>
                                    
                                    <div className="flex items-center gap-2 bg-gray-800 p-1 rounded border border-gray-700">
                                        <span className="text-xs text-gray-400 pl-2">Qty:</span>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            max="5" 
                                            value={aiCharacterCount}
                                            onChange={(e) => setAiCharacterCount(Math.max(1, Math.min(5, parseInt(e.target.value) || 1)))}
                                            className="w-8 bg-transparent text-center text-white text-xs focus:outline-none border-b border-gray-600"
                                        />
                                        <button 
                                            onClick={handleAutoGenerateCharacters} 
                                            disabled={isGeneratingCharacters || !topic.trim()}
                                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-gradient-to-r from-teal-500 to-cyan-600 rounded hover:from-teal-600 hover:to-cyan-700 transition disabled:opacity-50"
                                        >
                                            {isGeneratingCharacters ? <Spinner className="h-3 w-3 mr-0"/> : <SparklesIcon />}
                                            Auto-Gen
                                        </button>
                                    </div>
                                </div>
                                
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
                                    {characters.map((c, idx) => (
                                        <div key={c.id} className="bg-gray-800 p-2 rounded border border-gray-700 relative group">
                                            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                <button onClick={() => handleCopyCharacter(c, idx)} className="p-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded" title="Copy">
                                                    {copiedCharacterIndex === idx ? <span className="text-[8px] text-green-400">✓</span> : <CopyIcon className="h-3 w-3" />}
                                                </button>
                                                <button onClick={() => removeCharacter(c.id)} className="p-1 bg-gray-700 hover:bg-red-900/50 text-gray-400 hover:text-red-400 rounded" title="Remove">
                                                    <TrashIcon className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder="Name" 
                                                value={c.name} 
                                                onChange={(e) => updateCharacter(c.id, 'name', e.target.value)} 
                                                className="w-full bg-transparent text-cyan-400 font-bold text-xs mb-1 border-b border-transparent focus:border-cyan-500 focus:outline-none px-1" 
                                            />
                                            <div className="flex gap-2 mb-1">
                                                <input 
                                                    type="text" 
                                                    placeholder="Gender" 
                                                    value={c.gender} 
                                                    onChange={(e) => updateCharacter(c.id, 'gender', e.target.value)} 
                                                    className="w-1/2 bg-transparent text-gray-400 text-[10px] border-b border-transparent focus:border-gray-500 focus:outline-none px-1" 
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Age" 
                                                    value={c.age} 
                                                    onChange={(e) => updateCharacter(c.id, 'age', e.target.value)} 
                                                    className="w-1/2 bg-transparent text-gray-400 text-[10px] border-b border-transparent focus:border-gray-500 focus:outline-none px-1" 
                                                />
                                            </div>
                                            <textarea 
                                                placeholder="Description..." 
                                                value={c.description} 
                                                onChange={(e) => updateCharacter(c.id, 'description', e.target.value)} 
                                                className="w-full bg-gray-900/50 text-gray-300 text-[10px] rounded p-1 border border-gray-800 focus:border-cyan-500 focus:outline-none resize-y min-h-[40px]"
                                            />
                                        </div>
                                    ))}
                                    {characters.length === 0 && (
                                        <div className="text-center py-4 text-gray-500 text-xs italic">No characters added.</div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-300">Panel Size</label>
                                <select value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)} className={inputClasses}>
                                    {aspectRatios.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-3 gap-2">
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold mb-2 text-gray-300">Panels</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        max="100" 
                                        value={panelCount} 
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) {
                                                setPanelCount(Math.max(1, Math.min(100, val)));
                                            }
                                        }}
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold mb-2 text-gray-300">Start #</label>
                                    <input 
                                        type="number" 
                                        min="1" 
                                        value={startNumber} 
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (!isNaN(val)) {
                                                setStartNumber(Math.max(1, val));
                                            }
                                        }}
                                        className={inputClasses}
                                    />
                                </div>
                                <div className="col-span-1">
                                    <label className="block text-sm font-semibold mb-2 text-gray-300">Lang</label>
                                    <select value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClasses}>
                                        {languages.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            {isLoadingScript ? (
                                <div className="w-full p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                                    <div className="flex justify-between text-xs text-cyan-300 mb-1 font-semibold">
                                        <span>Generating Script...</span>
                                        <span>{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                        <div 
                                            className="bg-gradient-to-r from-pink-500 to-cyan-500 h-2.5 rounded-full transition-all duration-200 ease-out" 
                                            style={{ width: `${progress}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ) : (
                                <button 
                                    onClick={handleGenerateScript} 
                                    disabled={!topic.trim()} 
                                    className="w-full flex items-center justify-center px-4 py-2.5 font-bold text-white bg-gradient-to-r from-pink-600 to-cyan-600 rounded-lg shadow-lg hover:from-pink-500 hover:to-cyan-500 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Generate Script & Art
                                </button>
                            )}

                            {panels && (
                                <>
                                    <button 
                                        onClick={handleGenerateImages} 
                                        disabled={isGeneratingImages || allImagesGenerated} 
                                        className="w-full flex items-center justify-center px-4 py-2.5 font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-lg hover:from-cyan-500 hover:to-blue-500 transition-all active:scale-95 disabled:opacity-50 disabled:from-gray-600 disabled:to-gray-700"
                                    >
                                        {isGeneratingImages ? (
                                            <><Spinner /> Drawing {generatingIndex}/{panels.length}...</>
                                        ) : allImagesGenerated ? (
                                            'All Images Ready'
                                        ) : (
                                            Object.keys(panelImages).length > 0 ? 'Resume Generating Art' : 'Regenerate Art'
                                        )}
                                    </button>
                                    
                                    {Object.keys(panelImages).length > 0 && (
                                        <button 
                                            onClick={handleDownloadEpisode} 
                                            className="w-full flex items-center justify-center px-4 py-2.5 font-bold text-white bg-emerald-600 rounded-lg shadow-lg hover:bg-emerald-500 transition-all active:scale-95"
                                        >
                                            <DownloadIcon className="h-5 w-5" />
                                            <span className="ml-2">Download Full Episode</span>
                                        </button>
                                    )}

                                    <button 
                                        onClick={handleCopyAllScript} 
                                        className="w-full flex items-center justify-center px-4 py-2.5 font-bold text-white bg-gray-600 rounded-lg shadow-lg hover:bg-gray-500 transition-all active:scale-95"
                                    >
                                        <CopyIcon className="mr-2 h-4 w-4" />
                                        {copiedAll ? 'Copied!' : 'Copy Full Script'}
                                    </button>
                                </>
                            )}
                        </div>
                        
                        {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-300 rounded text-sm text-center">{error}</div>}
                    </div>
                </div>

                {/* Right/Center: Webtoon Preview */}
                <div className="lg:col-span-2">
                    <div className="bg-white min-h-[80vh] rounded-lg shadow-2xl overflow-hidden border-4 border-gray-800 relative">
                        {!panels ? (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                <div className="text-center">
                                    <span className="text-6xl block mb-2">📱</span>
                                    <p>Generated Webtoon will appear here.</p>
                                </div>
                            </div>
                        ) : (
                            <div ref={contentRef} className="w-full bg-white pb-12">
                                {/* Webtoon Header */}
                                <div className="bg-black text-white p-4 text-center">
                                    <h1 className="text-xl font-bold uppercase tracking-widest">{topic || 'Webtoon Title'}</h1>
                                    <p className="text-xs text-gray-400 mt-1">Original Series</p>
                                </div>

                                {/* Panels */}
                                <div className="flex flex-col items-center w-full max-w-md mx-auto">
                                    {panels.map((panel) => {
                                        const displayNum = panel.panelNumber + (startNumber - 1);
                                        return (
                                            <div key={panel.panelNumber} className="w-full relative mb-4 group">
                                                {/* Header for Part Number */}
                                                <div className="text-center py-3 bg-white w-full">
                                                    <span className="text-xs font-extrabold text-gray-400 tracking-widest uppercase border-b-2 border-gray-200 pb-1 px-3">
                                                        PART {displayNum}
                                                    </span>
                                                </div>

                                                {/* Main Panel Content - Target for Individual Download */}
                                                <div id={`webtoon-part-${panel.panelNumber}`} className="w-full bg-white relative">
                                                    {/* Image Container */}
                                                    <div 
                                                        className="w-full bg-gray-200 relative overflow-hidden border-y-2 border-black"
                                                        style={{ aspectRatio: aspectRatio.replace(':', '/') }}
                                                    >
                                                        {panelImages[panel.panelNumber] ? (
                                                            <img 
                                                                src={panelImages[panel.panelNumber]} 
                                                                alt={`Part ${displayNum}`} 
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                                                {isGeneratingImages && generatingIndex === panel.panelNumber ? (
                                                                    <div className="flex flex-col items-center">
                                                                        <Spinner className="h-8 w-8 text-blue-600 mb-2"/>
                                                                        <span className="text-xs text-blue-600 font-bold animate-pulse">Drawing Part {displayNum}...</span>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-xs text-gray-500 italic border p-2 rounded border-dashed border-gray-400">{panel.visualDescription}</p>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Dialogue Overlays */}
                                                    {panel.dialogue.map((dia, idx) => {
                                                        const isLeft = idx % 2 === 0;
                                                        const key = `${panel.panelNumber}-${idx}`;
                                                        const isLoadingAudio = audioUrls[key]?.loading;

                                                        return (
                                                            <div 
                                                                key={idx} 
                                                                className={`
                                                                    relative z-10 mx-4 -mt-8 mb-8
                                                                    ${dia.type === 'narration' ? 'w-[90%] mx-auto' : (isLeft ? 'self-start mr-12' : 'self-end ml-12')}
                                                                `}
                                                                style={{
                                                                    textAlign: dia.type === 'narration' ? 'center' : 'left'
                                                                }}
                                                            >
                                                                {dia.type === 'narration' ? (
                                                                    <div className="bg-gray-100 border border-gray-400 p-2 shadow-sm text-sm text-gray-800 font-serif">
                                                                        {dia.text}
                                                                        <div className="flex justify-center gap-2 mt-1 download-overlay">
                                                                            <button onClick={() => handlePlayAudio(panel.panelNumber, idx, dia.text)} disabled={isLoadingAudio} className="p-1 hover:bg-gray-200 rounded transition text-gray-600">
                                                                                {isLoadingAudio ? <Spinner className="h-3 w-3 m-0" /> : <PlayIcon className="h-3 w-3" />}
                                                                            </button>
                                                                            <button onClick={() => handleCopyText(dia.text, panel.panelNumber, idx)} className="p-1 hover:bg-gray-200 rounded transition text-gray-600">
                                                                                {copiedTextIndex === key ? <span className="text-[8px] text-green-600 font-bold">✓</span> : <CopyIcon className="h-3 w-3" />}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <div className={`bg-white border-2 border-black rounded-2xl p-3 shadow-lg text-sm text-black font-medium relative ${dia.type === 'thought' ? 'border-dashed' : ''}`}>
                                                                        <span className="block text-xs font-bold text-gray-500 mb-1">{dia.character}</span>
                                                                        {dia.text}
                                                                        <div className="flex justify-end gap-2 mt-2 border-t border-gray-100 pt-1 download-overlay">
                                                                            <button onClick={() => handlePlayAudio(panel.panelNumber, idx, dia.text)} disabled={isLoadingAudio} className="p-1 hover:bg-gray-100 rounded transition text-gray-400 hover:text-blue-500">
                                                                                {isLoadingAudio ? <Spinner className="h-3 w-3 m-0" /> : <PlayIcon className="h-3 w-3" />}
                                                                            </button>
                                                                            <button onClick={() => handleCopyText(dia.text, panel.panelNumber, idx)} className="p-1 hover:bg-gray-100 rounded transition text-gray-400 hover:text-green-500">
                                                                                {copiedTextIndex === key ? <span className="text-[8px] text-green-600 font-bold">✓</span> : <CopyIcon className="h-3 w-3" />}
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Individual Download Button (Visible on Hover) */}
                                                {panelImages[panel.panelNumber] && (
                                                    <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity download-overlay">
                                                        <button 
                                                            onClick={() => handleDownloadPart(panel.panelNumber)}
                                                            className="flex items-center gap-1 bg-black/70 text-white text-[10px] px-2 py-1 rounded shadow hover:bg-black/90 transition backdrop-blur-sm"
                                                            title="Download just this part"
                                                        >
                                                            <DownloadIcon className="h-3 w-3" />
                                                            Part {displayNum}
                                                        </button>
                                                    </div>
                                                )}
                                                
                                                {/* Gutter Space */}
                                                <div className="h-4 bg-white w-full"></div>
                                            </div>
                                        );
                                    })}
                                </div>
                                
                                {/* Footer */}
                                <div className="text-center pt-10 pb-20">
                                    <p className="text-gray-400 text-xs">To be continued...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WebtoonGenerator;