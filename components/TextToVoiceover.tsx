import React, { useState, useCallback, useEffect, useRef } from 'react';
// FIX: Renamed 'generateTextToVoiceover' to 'generateVoiceover' to match the exported function name from geminiService.
import { generateVoiceover } from '../services/geminiService.ts';
import type { PrebuiltVoice } from '../services/geminiService.ts';

type VoiceProfile = 'Male Adult' | 'Female Adult' | 'Male Youth' | 'Female Youth';

const voiceMapping: Record<VoiceProfile, PrebuiltVoice> = {
    'Male Adult': 'Kore',
    'Female Adult': 'Charon',
    'Male Youth': 'Puck',
    'Female Youth': 'Zephyr',
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

// Function to convert raw PCM data to a WAV blob
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

const TextToVoiceover: React.FC = () => {
    const [text, setText] = useState('');
    const [language, setLanguage] = useState<'km' | 'en'>('km');
    const [voice, setVoice] = useState<VoiceProfile>('Male Adult');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        // Cleanup blob URL to prevent memory leaks
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
        };
    }, [audioUrl]);

    const handleGenerate = useCallback(async () => {
        if (!text.trim()) {
            setError('Please enter some text to generate a voiceover.');
            return;
        }

        setIsLoading(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            const prebuiltVoice = voiceMapping[voice];
            // FIX: Renamed 'generateTextToVoiceover' to 'generateVoiceover' to match the exported function name from geminiService.
            const base64Audio = await generateVoiceover(text, language, prebuiltVoice);
            
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
            setIsLoading(false);
        }
    }, [text, language, voice, audioUrl]);
    
    useEffect(() => {
        if (audioUrl && audioRef.current) {
            audioRef.current.play();
        }
    }, [audioUrl]);

    const handleClear = () => {
        setText('');
        setError(null);
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioUrl(null);
    };


    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
            <ClearProjectButton onClick={handleClear} />
            <div className="w-full bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Text to Voiceover</h2>
                    <p className="text-gray-400 mt-2">Paste text, choose a voice, and generate high-quality audio narration.</p>
                </div>

                <div>
                    <label htmlFor="vo-text" className="block text-sm font-semibold mb-2 text-gray-300">Text Prompt</label>
                    <textarea
                        id="vo-text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Paste your script here..."
                        className="bg-gray-700 border border-gray-600 text-white text-base rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-4 h-48 resize-y"
                        disabled={isLoading}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Choose Language</label>
                        <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-lg">
                            <button onClick={() => setLanguage('km')} disabled={isLoading} className={`w-full px-3 py-2 text-sm font-semibold rounded-md transition ${language === 'km' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>Cambodia</button>
                            <button onClick={() => setLanguage('en')} disabled={isLoading} className={`w-full px-3 py-2 text-sm font-semibold rounded-md transition ${language === 'en' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>English</button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Choose Voice</label>
                        <div className="grid grid-cols-2 gap-2">
                             {(Object.keys(voiceMapping) as VoiceProfile[]).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setVoice(v)}
                                    disabled={isLoading}
                                    className={`px-3 py-2 text-xs md:text-sm font-semibold rounded-md transition w-full ${voice === v ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                    {v}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                 {error && (
                    <div className="my-2 p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                        {error}
                    </div>
                )}
                
                {audioUrl && (
                     <div className="space-y-4">
                        <audio ref={audioRef} controls src={audioUrl} className="w-full">
                            Your browser does not support the audio element.
                        </audio>
                        <a
                            href={audioUrl}
                            download={`voiceover-${Date.now()}.wav`}
                            className="w-full sm:w-auto flex items-center justify-center px-6 py-2.5 font-semibold text-white bg-gray-600 rounded-lg shadow-lg border-b-4 border-gray-800 hover:bg-gray-500 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2"
                        >
                             <span className="text-xl mr-2">💾</span>
                             Download Voice
                        </a>
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={isLoading || !text.trim()}
                    className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? <><Spinner /> Generating...</> : <><span className="text-xl mr-2">🔊</span><span>Generate Voiceover</span></>}
                </button>
            </div>
        </div>
    );
};

export default TextToVoiceover;