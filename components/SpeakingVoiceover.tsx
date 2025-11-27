import React, { useState, useCallback, useEffect, useRef } from 'react';
import { generateVoiceover, translateText } from '../services/geminiService.ts';
import type { PrebuiltVoice } from '../services/geminiService.ts';

// --- Component Specific Constants ---

interface CharacterType {
  name: string;
  emoji: string;
  description: string;
  voice: PrebuiltVoice;
};

const characterTypes: CharacterType[] = [
  { name: 'លោកតា', emoji: '👴', description: 'like a wise, old grandfather', voice: 'Fenrir' },
  { name: 'លោកយាយ', emoji: '👵', description: 'like a gentle, old grandmother', voice: 'Zephyr' },
  { name: 'លោកពូ', emoji: '👨‍🦳', description: 'like a friendly, middle-aged uncle', voice: 'Kore' },
  { name: 'អ្នកមីង', emoji: '👩‍🦳', description: 'like a friendly, middle-aged aunt', voice: 'Zephyr' },
  { name: 'កំលោះ', emoji: '👨', description: 'like a confident young man', voice: 'Kore' },
  { name: 'ក្រមុំ', emoji: '👩', description: 'like a sweet young woman', voice: 'Zephyr' },
];

interface VoiceEmotion {
  name: string;
  emoji: string;
  description: string;
  promptKeyword: string;
}

const voiceEmotions: VoiceEmotion[] = [
  { name: 'សប្បាយរីករាយ', emoji: '😄', description: 'សំឡេងមានថាមពល ខ្ពស់បន្តិច', promptKeyword: 'in a cheerful tone' },
  { name: 'ព្រួយសោក', emoji: '😢', description: 'សំឡេងទន់ ធ្លាក់ស្ទើរលើទឹកភ្នែក', promptKeyword: 'in a sad tone' },
  { name: 'ខឹង', emoji: '😡', description: 'សំឡេងខ្ពស់ តឹងរឹង ឬលឿន', promptKeyword: 'in an angry tone' },
  { name: 'ស្ងប់អារម្មណ៍', emoji: '😌', description: 'សំឡេងស្រទន់ ស្ងប់ស្ងាត់ ត្រលប់មកធម្មតាវិញ', promptKeyword: 'in a calm and soothing tone' },
  { name: 'ភ័យ', emoji: '😨', description: 'សំឡេងខ្សោយ ខ្លីៗ ឬដង្ហើមលឿន', promptKeyword: 'in a fearful tone' },
  { name: 'ស្រឡាញ់', emoji: '😍', description: 'សំឡេងទន់ អៀន ឬមានស្នាមញញឹម', promptKeyword: 'in a loving tone' },
  { name: 'ធម្មតា', emoji: '😐', description: 'សំឡេងធម្មតា មានសមតុល្យ', promptKeyword: 'in a normal, balanced tone' },
  { name: 'កំប្លែង', emoji: '😂', description: 'សំឡេងលេងសើច ឬបញ្ចេញចំណង់កំប្លែង', promptKeyword: 'in a humorous tone' },
  { name: 'ធ្លាក់ទឹកចិត្ត', emoji: '😔', description: 'សំឡេងទន់ និងយឺតបន្តិច', promptKeyword: 'in a depressed tone' },
  { name: 'សង្ស័យ', emoji: '🤔', description: 'សំឡេងលើកចំណងសួរ ឬស្ទាក់ស្ទើរ', promptKeyword: 'in a doubtful tone' },
  { name: 'មានទំនុកចិត្ត', emoji: '😎', description: 'សំឡេងជាអ្នកដឹកនាំ ឬគួរឱ្យគោរព', promptKeyword: 'in a confident tone' },
];

const languages = [
  { code: 'Khmer', name: '🇰🇭 Khmer' },
  { code: 'English', name: '🇬🇧 English' },
  { code: 'Thai', name: '🇹🇭 Thai' },
  { code: 'Vietnamese', name: '🇻🇳 Vietnamese' },
  { code: 'Japanese', name: '🇯🇵 Japanese' },
  { code: 'Korean', name: '🇰🇷 Korean' },
  { code: 'French', name: '🇫🇷 French' },
  { code: 'Indonesian', name: '🇮🇩 Indonesian' },
  { code: 'Chinese', name: '🇨🇳 Chinese' },
  { code: 'Filipino', name: '🇵🇭 Filipino' },
  { code: 'Malay', name: '🇸🇬 Malay' },
  { code: 'Hindi', name: '🇮🇳 Hindi' },
  { code: 'Spanish', name: '🇪🇸 Spanish' },
  { code: 'German', name: '🇩🇪 German' },
];


// --- Reusable Helper Components ---
const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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


const SpeakingVoiceover: React.FC = () => {
    const [prompt, setPrompt] = useState('');
    const [translatedScript, setTranslatedScript] = useState('');
    const [sourceLang, setSourceLang] = useState('Khmer');
    const [targetLang, setTargetLang] = useState('English');
    const [selectedChar, setSelectedChar] = useState<CharacterType>(characterTypes[2]); // Default to a neutral adult voice
    const [selectedEmotion, setSelectedEmotion] = useState<VoiceEmotion>(voiceEmotions[5]); // Default to 'normal'
    const [isTranslating, setIsTranslating] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        // Cleanup blob URL to prevent memory leaks
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const handleTranslate = useCallback(async () => {
        if (!prompt.trim()) {
            setError('Please enter a script to translate.');
            return;
        }
        if (sourceLang === targetLang) {
            setError('Source and target languages must be different.');
            return;
        }
        setIsTranslating(true);
        setError(null);
        setTranslatedScript('');
        try {
            const result = await translateText(prompt, sourceLang, targetLang);
            setTranslatedScript(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during translation.');
        } finally {
            setIsTranslating(false);
        }
    }, [prompt, sourceLang, targetLang]);


    const handleGenerateVoiceover = useCallback(async () => {
        const textToSpeak = translatedScript.trim() || prompt.trim();
        const languageToSpeak = translatedScript.trim() ? targetLang : sourceLang;
        
        if (!textToSpeak) {
            setError('Please enter a script to generate a voiceover.');
            return;
        }

        setIsGeneratingVoice(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            const base64Audio = await generateVoiceover(textToSpeak, languageToSpeak, selectedChar.voice, selectedEmotion.promptKeyword, selectedChar.description);
            
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            
            // The Gemini TTS model returns 24kHz mono audio
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            
            setAudioUrl(url);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsGeneratingVoice(false);
        }
    }, [prompt, translatedScript, sourceLang, targetLang, audioUrl, selectedChar, selectedEmotion]);
    
    useEffect(() => {
        if (audioUrl && audioRef.current) {
            audioRef.current.play();
        }
    }, [audioUrl]);
    
    const handleCopy = () => {
        if (!translatedScript) return;
        navigator.clipboard.writeText(translatedScript);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleClear = () => {
        setPrompt('');
        setTranslatedScript('');
        setError(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
    };

    const isLoading = isTranslating || isGeneratingVoice;

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col h-full">
            <ClearProjectButton onClick={handleClear} />
            
            {/* Top Translation Bar */}
            <div className="w-full bg-gray-800/80 p-3 md:p-4 rounded-lg border border-gray-700 mb-6 flex flex-col md:flex-row items-center gap-4 justify-between shadow-md backdrop-blur-sm">
                <div className="flex items-center gap-3 w-full md:w-auto flex-grow">
                    <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none flex-1 font-medium">
                        {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                    </select>
                    <span className="text-gray-400 font-bold px-1">→</span>
                    <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="bg-gray-700 text-gray-200 border border-gray-600 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none flex-1 font-medium">
                        {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                    </select>
                </div>
                <button onClick={handleTranslate} disabled={isLoading || !prompt} className="w-full md:w-auto px-6 py-2.5 font-bold text-white bg-cyan-600 rounded-lg shadow-md hover:bg-cyan-500 disabled:opacity-50 transition-all duration-200 transform active:scale-95 flex items-center justify-center">
                    {isTranslating ? <Spinner className="h-5 w-5 text-white"/> : <><span className="mr-2">🌐</span>Translate</>}
                </button>
            </div>

            {/* Text Areas Grid */}
            <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 mb-24">
                <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-[350px] shadow-inner">
                    <h2 className="text-lg font-semibold text-gray-300 mb-3 flex items-center gap-2">
                        <span>✍️</span> Paste Script / Prompt
                    </h2>
                    <textarea 
                        value={prompt} 
                        onChange={(e) => setPrompt(e.target.value)} 
                        placeholder="Paste your script here..." 
                        className="flex-grow w-full bg-gray-900/80 text-gray-200 rounded-md p-4 resize-none border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none transition-all placeholder-gray-500" 
                        disabled={isLoading}
                    />
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-[350px] shadow-inner relative">
                     <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                            <span>💬</span> Translated Script
                        </h2>
                        <button onClick={handleCopy} disabled={!translatedScript.trim()} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 rounded-md shadow-sm hover:bg-emerald-500 transition disabled:opacity-50 active:scale-95">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <textarea 
                        value={translatedScript} 
                        readOnly 
                        placeholder="Translation will appear here..." 
                        className="flex-grow w-full bg-gray-900/80 text-gray-200 rounded-md p-4 resize-none border border-gray-600 focus:outline-none cursor-default placeholder-gray-500"
                    />
                    {audioUrl && (
                         <div className="mt-3 p-2 bg-gray-900 rounded-md border border-gray-700">
                            <audio ref={audioRef} controls src={audioUrl} className="w-full h-8" />
                         </div>
                     )}
                </div>
            </div>
            
             {error && (
                <div className="fixed bottom-32 left-1/2 transform -translate-x-1/2 z-50 bg-red-900/90 border border-red-700 text-red-200 px-6 py-3 rounded-lg shadow-xl backdrop-blur-sm">
                    {error}
                </div>
            )}

            {/* Bottom Sticky Panel for Voice Generation */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800/90 backdrop-blur-lg border-t border-gray-700 p-4 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
                 <div className="max-w-7xl mx-auto space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 text-center md:text-left">🎭 Character Type</h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                                {characterTypes.map(char => (
                                    <button key={char.name} onClick={() => setSelectedChar(char)} disabled={isLoading} className={`flex-shrink-0 px-3 py-2 rounded-lg transition-all border ${selectedChar.name === char.name ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}>
                                        <span className="mr-1">{char.emoji}</span>
                                        <span className="text-sm font-medium">{char.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                         <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2 text-center md:text-left">🎙️ Voice Emotion</h3>
                            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
                                {voiceEmotions.map(emotion => (
                                    <button key={emotion.name} onClick={() => setSelectedEmotion(emotion)} disabled={isLoading} className={`flex-shrink-0 px-3 py-2 rounded-lg transition-all border ${selectedEmotion.name === emotion.name ? 'bg-purple-600 border-purple-400 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}>
                                        <span className="mr-1">{emotion.emoji}</span>
                                        <span className="text-sm font-medium">{emotion.name}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-gray-700">
                         <button
                            onClick={handleGenerateVoiceover}
                            disabled={isLoading || !prompt.trim()}
                            className="flex-1 flex items-center justify-center px-6 py-3 font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-500 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-600 transform transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isGeneratingVoice ? <><Spinner /> Generating Audio...</> : <><span className="text-xl mr-2">▶️</span><span>Generate Voiceover</span></>}
                        </button>
                        <a
                            href={audioUrl ?? '#'}
                            download={`speaking-voiceover-${Date.now()}.wav`}
                            className={`sm:w-auto w-full flex items-center justify-center px-6 py-3 font-bold text-white bg-gray-700 rounded-lg shadow-lg border border-gray-600 hover:bg-gray-600 transform transition-all duration-200 active:scale-95 ${!audioUrl ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}
                            onClick={(e) => !audioUrl && e.preventDefault()}
                        >
                             <span className="text-xl mr-2">💾</span>
                             Download MP3
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SpeakingVoiceover;