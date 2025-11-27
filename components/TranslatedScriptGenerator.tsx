import React, { useState, useCallback, useEffect, useRef } from 'react';
import { translateText, generateVoiceover } from '../services/geminiService.ts';
import type { PrebuiltVoice } from '../services/geminiService.ts';

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

    view.setUint32(0, 0x52494646, false); 
    view.setUint32(4, 36 + dataSize, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    view.setUint32(28, byteRate, true);
    const blockAlign = numChannels * (bitsPerSample / 8);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, dataSize, true);
    for (let i = 0; i < pcmData.length; i++) {
        view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return new Blob([view], { type: 'audio/wav' });
};


// --- Component Specific Constants ---

const languages = [
  { code: 'Khmer', name: '🇰🇭 Khmer' },
  { code: 'English', name: '🇬🇧 English' },
  { code: 'Japanese', name: '🇯🇵 Japanese' },
  { code: 'Korean', name: '🇰🇷 Korean' },
  { code: 'French', name: '🇫🇷 French' },
  { code: 'Indonesian', name: '🇮🇩 Indonesian' },
  { code: 'Chinese', name: '🇨🇳 Chinese' },
  { code: 'Filipino', name: '🇵🇭 Filipino' },
  { code: 'Malay', name: '🇸🇬 Malay' },
  { code: 'Hindi', name: '🇮🇳 Hindi' },
];

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


// --- Main Component ---

const TranslatedScriptGenerator: React.FC = () => {
    const [script, setScript] = useState('');
    const [translatedScript, setTranslatedScript] = useState('');
    const [sourceLang, setSourceLang] = useState('Khmer');
    const [targetLang, setTargetLang] = useState('English');
    const [selectedChar, setSelectedChar] = useState<CharacterType>(characterTypes[0]);
    const [selectedEmotion, setSelectedEmotion] = useState<VoiceEmotion>(voiceEmotions[5]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);

    useEffect(() => {
        if (audioUrl && audioRef.current) {
            audioRef.current.play();
        }
    }, [audioUrl]);

    const handleTranslate = useCallback(async () => {
        if (!script.trim()) {
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
            const result = await translateText(script, sourceLang, targetLang);
            setTranslatedScript(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during translation.');
        } finally {
            setIsTranslating(false);
        }
    }, [script, sourceLang, targetLang]);

    const handleGenerateVoiceover = useCallback(async () => {
        const textToSpeak = translatedScript.trim() || script.trim();
        const languageToSpeak = translatedScript.trim() ? targetLang : sourceLang;

        if (!textToSpeak) {
            setError('There is no script to generate a voiceover for.');
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
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during voice generation.');
        } finally {
            setIsGeneratingVoice(false);
        }
    }, [script, translatedScript, sourceLang, targetLang, selectedChar, selectedEmotion, audioUrl]);
    
    const handleDownloadScript = () => {
        const textToDownload = translatedScript.trim() || script.trim();
        if (!textToDownload) return;
        
        const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `script-${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadVoiceover = () => {
        if (!audioUrl) return;
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `voiceover-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setScript('');
        setTranslatedScript('');
        setSourceLang('Khmer');
        setTargetLang('English');
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
    };

    const isLoading = isTranslating || isGeneratingVoice;
    
    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col">
            <ClearProjectButton onClick={handleClear} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-[300px]">
                    <h2 className="text-lg font-semibold text-gray-300 mb-2">Speech Script Text</h2>
                    <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="Enter your script here..." className="flex-grow w-full bg-gray-900 text-gray-200 rounded-md p-3 resize-y border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none" disabled={isLoading}></textarea>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-[300px]">
                    <h2 className="text-lg font-semibold text-gray-300 mb-2">Translated Script & Voiceover</h2>
                    <textarea value={translatedScript} readOnly placeholder="Translation will appear here..." className="flex-grow w-full bg-gray-900 text-gray-200 rounded-md p-3 resize-y border border-gray-600 focus:outline-none cursor-default"></textarea>
                     {audioUrl && <audio ref={audioRef} controls src={audioUrl} className="w-full mt-2 h-10" />}
                </div>
            </div>
             {error && (
                <div className="my-2 p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    {error}
                </div>
            )}
            <div className="sticky bottom-0 left-0 right-0 w-full bg-gray-800/80 backdrop-blur-lg border-t border-gray-700 p-4 rounded-t-lg space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                        <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                           {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                        </select>
                        <span className="text-gray-400">to</span>
                        <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="w-full bg-gray-700 text-gray-200 border border-gray-600 rounded-md p-2.5 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                           {languages.map(lang => <option key={lang.code} value={lang.code}>{lang.name}</option>)}
                        </select>
                         <button onClick={handleTranslate} disabled={isLoading || !script} className="px-4 py-2.5 font-semibold text-white bg-cyan-600 rounded-lg shadow-md hover:bg-cyan-500 disabled:opacity-50 transition">
                            {isTranslating ? <Spinner className="m-auto h-5 w-5"/> : 'Translate'}
                        </button>
                    </div>
                    <div>
                         <h3 className="text-sm font-semibold text-center mb-2 text-gray-300">🎭 ប្រភេទតួអង្គ (Character Types)</h3>
                         <div className="grid grid-cols-4 lg:grid-cols-7 gap-2">
                             {characterTypes.map(char => (
                                <button key={char.name} onClick={() => setSelectedChar(char)} disabled={isLoading} title={char.description} className={`p-2 text-sm text-center rounded-lg transition-all transform hover:scale-105 ${selectedChar.name === char.name ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-gray-700 text-gray-300'}`}>
                                    <span className="text-2xl block">{char.emoji}</span>
                                    <span className="text-xs">{char.name}</span>
                                </button>
                             ))}
                         </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-semibold text-center mb-2 text-gray-300">🎙️ ប្រភេទអារម្មណ៍នៃសំឡេង (Voice Emotions / Tone Styles)</h3>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {voiceEmotions.map(emotion => (
                            <button key={emotion.name} onClick={() => setSelectedEmotion(emotion)} disabled={isLoading} title={emotion.description} className={`p-2 text-sm text-center rounded-lg transition-all transform hover:scale-105 ${selectedEmotion.name === emotion.name ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-gray-700 text-gray-300'}`}>
                                <span className="text-2xl block">{emotion.emoji}</span>
                                <span className="text-xs">{emotion.name}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-gray-700 pt-4">
                    <button onClick={handleGenerateVoiceover} disabled={isLoading || !script} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition active:translate-y-0.5 active:border-b-2 disabled:opacity-50">
                        {isGeneratingVoice ? <Spinner /> : 'Start' }
                        {isGeneratingVoice ? 'Generating Voice...' : 'Generate Voiceover'}
                    </button>
                    <button onClick={handleDownloadVoiceover} disabled={isLoading || !audioUrl} className="w-full flex items-center justify-center px-4 py-3 font-semibold bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-500 disabled:opacity-50 transition">
                        Download Voiceover
                    </button>
                    <button onClick={handleDownloadScript} disabled={isLoading || (!script && !translatedScript)} className="w-full flex items-center justify-center px-4 py-3 font-semibold bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-500 disabled:opacity-50 transition">
                        Download Script Text
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TranslatedScriptGenerator;
