import React, { useState, useCallback, useEffect, useRef } from 'react';
// FIX: Renamed 'generateTextToVoiceover' to 'generateVoiceover' to match the exported function name from geminiService.
import { generateVoiceover, generateDialog } from '../services/geminiService.ts';
import type { PrebuiltVoice, Dialog } from '../services/geminiService.ts';

type Mode = 'solo' | 'team';
type Gender = 'male' | 'female';

interface Character {
    id: number;
    name: string;
    gender: Gender;
    voice: PrebuiltVoice;
}

const voices: Record<Gender, { name: PrebuiltVoice, description: string }[]> = {
    male: [
        { name: 'Kore', description: 'Adult Male 1' },
        { name: 'Puck', description: 'Youth Male' },
        { name: 'Fenrir', description: 'Adult Male 2' }
    ],
    female: [
        { name: 'Charon', description: 'Adult Female' },
        { name: 'Zephyr', description: 'Youth Female' },
    ]
};

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

const parseTeamScript = (scriptText: string, characterNames: string[]): Dialog[] => {
    if (characterNames.length === 0) return [];
    const dialogs: Dialog[] = [];
    const characterPattern = characterNames.map(name => name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')).join('|');
    const lineRegex = new RegExp(`^(${characterPattern}):\\s*([\\s\\S]*?)(?=\\n(?:${characterPattern}):|$)`, 'gm');
    
    let match;
    while ((match = lineRegex.exec(scriptText)) !== null) {
        dialogs.push({
            character: match[1].trim(),
            line: match[2].trim()
        });
    }
    return dialogs;
};


const VoiceOverGenerator: React.FC = () => {
    const [mode, setMode] = useState<Mode>('solo');
    const [language, setLanguage] = useState<'km' | 'en'>('km');
    const [script, setScript] = useState('');
    const [characters, setCharacters] = useState<Character[]>([
        { id: Date.now(), name: 'narrator', gender: 'male', voice: 'Kore' }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [autoSetup, setAutoSetup] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    
    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);
    
    useEffect(() => {
        if (audioUrl && audioRef.current) {
            audioRef.current.play();
        }
    }, [audioUrl]);

    useEffect(() => {
        if (mode === 'team' && autoSetup) {
            const interviewerName = language === 'km' ? 'អ្នកសម្ភាសន៍' : 'Interviewer';

            if (characters[0]?.name !== interviewerName) {
                setCharacters(prev => {
                    const newChars = [...prev];
                    if (newChars[0]) {
                        newChars[0] = { ...newChars[0], name: interviewerName, gender: 'male', voice: 'Kore' };
                    }
                    if (newChars[1]) {
                        newChars[1] = { ...newChars[1], gender: 'female', voice: 'Charon'};
                    }
                    return newChars;
                });
            }

            const intervieweeName = characters[1]?.name.trim() || (language === 'km' ? '[ឈ្មោះអ្នកផ្តល់បទសម្ភាសន៍]' : '[Interviewee Name]');

            const getTemplate = (lang: 'km' | 'en') => {
                const iName = lang === 'km' ? 'អ្នកសម្ភាសន៍' : 'Interviewer';
                const iPlaceholder = lang === 'km' ? `[នៅទីនេះ អ្នកអាចសរសេរចម្លើយរបស់អ្នកផ្តល់បទសម្ភាសន៍អំពី... ]` : `[Here, you can write the interviewee's response about... ]`;
                if (lang === 'km') {
                    return `${iName}: សូមស្វាគមន៍មកកាន់รายการរបស់យើង។ តើអ្នកអាចណែនាំខ្លួនដល់អ្នកស្តាប់របស់យើងបានទេ?\n\n${intervieweeName}: សូមអរគុណដែលបានអញ្ជើញខ្ញុំ។ ខ្ញុំឈ្មោះ ${intervieweeName}។\n\n${iName}: ពិតជាអស្ចារ្យណាស់។ តើអ្នកអាចប្រាប់យើងបន្តិចបន្តួចអំពីខ្លួនអ្នកបានទេ? ឧទាហរណ៍ អាយុ ការងារ និងគ្រួសាររបស់អ្នក?\n\n${intervieweeName}: ${iPlaceholder}\n\n${iName}: ហើយតើអ្នកមកពីណា?\n\n${intervieweeName}: ${iPlaceholder}\n\n${iName}: មុននឹងយើងចូលទៅកាន់ប្រធានបទសំខាន់ តើអ្នកអាចចែករំលែកបន្តិចបន្តួចអំពីអ្វីដែលអ្នកបានធ្វើមុនពេលការងារបច្ចុប្បន្នរបស់អ្នកបានទេ?\n\n${intervieweeName}: ${iPlaceholder}`;
                }
                return `${iName}: Welcome to our show. Could you please introduce yourself to our listeners?\n\n${intervieweeName}: Thank you for having me. My name is ${intervieweeName}.\n\n${iName}: Great to have you. Can you tell us a bit about yourself? For example, your age, your work, and a little about your family?\n\n${intervieweeName}: ${iPlaceholder}\n\n${iName}: And where are you from?\n\n${intervieweeName}: ${iPlaceholder}\n\n${iName}: Before we dive into the main topic, could you share a bit about what you did before your current work?\n\n${intervieweeName}: ${iPlaceholder}`;
            };

            setScript(getTemplate(language));
        }
    }, [autoSetup, mode, language, characters[0]?.name, characters[1]?.name]);


    const handleModeChange = (newMode: Mode) => {
        setMode(newMode);
        setAutoSetup(false);
        if (newMode === 'solo') {
            setCharacters([{ id: Date.now(), name: 'narrator', gender: 'male', voice: 'Kore' }]);
        } else {
            setCharacters([
                { id: Date.now(), name: '', gender: 'male', voice: 'Kore' },
                { id: Date.now() + 1, name: '', gender: 'female', voice: 'Charon' }
            ]);
        }
    };

    const updateCharacter = (id: number, field: keyof Character, value: any) => {
        setCharacters(prev => prev.map(char => {
            if (char.id === id) {
                const updatedChar = { ...char, [field]: value };
                if (field === 'gender') {
                    updatedChar.voice = voices[value as Gender][0].name;
                }
                return updatedChar;
            }
            return char;
        }));
    };

    const handleGenerate = useCallback(async () => {
        if (!script.trim()) {
            setError('Please enter some text to generate a voiceover.');
            return;
        }
        setIsLoading(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            let base64Audio: string;
            if (mode === 'solo') {
                // FIX: Renamed 'generateTextToVoiceover' to 'generateVoiceover' to match the exported function name from geminiService.
                base64Audio = await generateVoiceover(script, language, characters[0].voice);
            } else {
                const speakerNames = characters.map(c => c.name).filter(Boolean);
                if (speakerNames.length !== 2) {
                    throw new Error("Please provide names for both speakers.");
                }
                const parsedDialog = parseTeamScript(script, speakerNames);
                if (parsedDialog.length === 0) {
                    throw new Error("Could not find any matching speaker lines in the script. Ensure names match and format is 'Name: text'.");
                }
                const speakerConfigs = characters.map(c => ({ speaker: c.name, voiceName: c.voice }));
                base64Audio = await generateDialog(parsedDialog, speakerConfigs);
            }

            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [script, language, characters, mode, audioUrl]);

    const handleClear = () => {
        setScript('');
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
    };
    
    const isReady = script.trim() && (mode === 'solo' || characters.every(c => c.name.trim()));

    const inputClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400 disabled:opacity-50";

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            <div className="w-full bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Voice Over Generator</h2>
                    <p className="text-gray-400 mt-2">Paste your script, assign voices, and generate solo or team voice overs.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Mode</label>
                        <div className="flex items-center gap-1 bg-gray-700 p-1 rounded-lg">
                            <button onClick={() => handleModeChange('solo')} disabled={isLoading} className={`w-full py-2 text-sm font-semibold rounded-md transition ${mode === 'solo' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>Solo</button>
                            <button onClick={() => handleModeChange('team')} disabled={isLoading} className={`w-full py-2 text-sm font-semibold rounded-md transition ${mode === 'team' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>Team</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Language</label>
                        <div className="flex items-center gap-1 bg-gray-700 p-1 rounded-lg">
                            <button onClick={() => setLanguage('km')} disabled={isLoading} className={`w-full py-2 text-sm font-semibold rounded-md transition ${language === 'km' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>Cambodia</button>
                            <button onClick={() => setLanguage('en')} disabled={isLoading} className={`w-full py-2 text-sm font-semibold rounded-md transition ${language === 'en' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>English</button>
                        </div>
                    </div>
                </div>
                {mode === 'team' && (
                     <div className="relative flex items-start">
                        <div className="flex h-6 items-center">
                            <input
                                id="autoSetup"
                                type="checkbox"
                                checked={autoSetup}
                                onChange={(e) => setAutoSetup(e.target.checked)}
                                className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-600"
                                disabled={isLoading}
                            />
                        </div>
                        <div className="ml-3 text-sm">
                            <label htmlFor="autoSetup" className="font-medium text-gray-300">
                                Auto Interview Setup
                            </label>
                            <p className="text-gray-400">Sets up an interviewer and provides a script template.</p>
                        </div>
                    </div>
                )}
                <div>
                    <label htmlFor="vo-script" className="block text-sm font-semibold mb-2 text-gray-300">Script</label>
                    <textarea
                        id="vo-script"
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder={mode === 'solo' ? "Paste your script here..." : "Paste your script here, e.g.,\n\nSpeaker1Name: Hello there.\nSpeaker2Name: Hi!"}
                        className={`${inputClasses} h-48 resize-y`}
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <h3 className="text-base font-semibold mb-2 text-gray-300">Voice Setup</h3>
                     {mode === 'solo' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                             <div>
                                <label className="block text-xs font-medium mb-1 text-gray-400">Gender</label>
                                <select value={characters[0].gender} onChange={e => updateCharacter(characters[0].id, 'gender', e.target.value)} className={inputClasses}>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium mb-1 text-gray-400">Voice</label>
                                <select value={characters[0].voice} onChange={e => updateCharacter(characters[0].id, 'voice', e.target.value)} className={inputClasses}>
                                    {voices[characters[0].gender].map(v => <option key={v.name} value={v.name}>{v.description}</option>)}
                                </select>
                            </div>
                        </div>
                     ) : (
                        <div className="space-y-4">
                            {characters.map((char, index) => (
                                <div key={char.id} className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                                    <h4 className="font-semibold text-cyan-400 mb-3">{autoSetup ? (index === 0 ? 'Interviewer' : 'Interviewee') : `Speaker ${index + 1}`}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-400">Name (from script)</label>
                                            <input type="text" placeholder={`Speaker ${index+1} Name`} value={char.name} onChange={e => updateCharacter(char.id, 'name', e.target.value)} className={inputClasses} disabled={autoSetup && index === 0}/>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-400">Gender</label>
                                            <select value={char.gender} onChange={e => updateCharacter(char.id, 'gender', e.target.value)} className={inputClasses} disabled={autoSetup}>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                            </select>
                                        </div>
                                         <div>
                                            <label className="block text-xs font-medium mb-1 text-gray-400">Voice</label>
                                            <select value={char.voice} onChange={e => updateCharacter(char.id, 'voice', e.target.value)} className={inputClasses} disabled={autoSetup}>
                                                {voices[char.gender].map(v => <option key={v.name} value={v.name}>{v.description}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                     )}
                </div>
                 {error && <div className="p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">{error}</div>}
                 {audioUrl && (
                     <div className="space-y-4">
                        <audio ref={audioRef} controls src={audioUrl} className="w-full" />
                        <a href={audioUrl} download={`voiceover-${Date.now()}.wav`} className="block w-full text-center px-6 py-2.5 font-semibold text-white bg-gray-600 rounded-lg shadow-lg border-b-4 border-gray-800 hover:bg-gray-500 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2">
                             Download Voice
                        </a>
                    </div>
                )}
                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !isReady}
                    className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <><Spinner /> Generating...</> : <><span className="text-xl mr-2">🔊</span><span>Generate Voice Over</span></>}
                </button>
            </div>
        </div>
    );
};

export default VoiceOverGenerator;