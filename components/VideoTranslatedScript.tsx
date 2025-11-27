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

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
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

interface ScriptLine {
  timestamp: string;
  text: string;
}

// --- Main Component ---

const VideoTranslatedScript: React.FC = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [script, setScript] = useState('');
    const [translatedScript, setTranslatedScript] = useState('');
    const [structuredTranslatedScript, setStructuredTranslatedScript] = useState<ScriptLine[] | null>(null);
    const [sourceLang, setSourceLang] = useState('Khmer');
    const [targetLang, setTargetLang] = useState('English');
    const [selectedChar, setSelectedChar] = useState<CharacterType>(characterTypes[0]);
    const [selectedEmotion, setSelectedEmotion] = useState<VoiceEmotion>(voiceEmotions[5]);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [playbackMode, setPlaybackMode] = useState<'original' | 'voiceover'>('original');
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        return () => { 
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            if (audioUrl) URL.revokeObjectURL(audioUrl); 
        };
    }, [videoUrl, audioUrl]);

    useEffect(() => {
        const video = videoRef.current;
        const audio = audioRef.current;
        if (!video || !audio || !audioUrl) return;

        const handlePlay = () => {
            if (playbackMode === 'voiceover') audio.play();
        };
        const handlePause = () => {
            if (playbackMode === 'voiceover') audio.pause();
        };
        const handleSeeked = () => {
            if (playbackMode === 'voiceover' && Math.abs(video.currentTime - audio.currentTime) > 0.5) {
                audio.currentTime = video.currentTime;
            }
        };

        if (playbackMode === 'voiceover') {
            video.muted = true;
            video.addEventListener('play', handlePlay);
            video.addEventListener('pause', handlePause);
            video.addEventListener('seeked', handleSeeked);
        } else {
            video.muted = false;
            audio.pause();
        }

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeked', handleSeeked);
        };
    }, [playbackMode, audioUrl]);

    const handleVideoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            setVideoFile(file);
            setError(null);
        }
    };

    const handleStart = useCallback(async () => {
        if (!script.trim()) {
            setError('Please enter a script to start.');
            return;
        }
        if (!videoUrl) {
            setError('Please upload a video to start.');
            return;
        }

        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setError(null);
        setTranslatedScript('');
        setStructuredTranslatedScript(null);
        setPlaybackMode('original');
        
        setIsTranslating(true);

        const scriptLines: ScriptLine[] = [];
        const lines = script.split('\n');
        const timestampRegex = /^(\d{2}:\d{2}(?::\d{2})?):\s*(.*)/;

        for (const line of lines) {
            const match = line.match(timestampRegex);
            if (match) {
                scriptLines.push({ timestamp: match[1], text: match[2] });
            } else if (line.trim()) {
                scriptLines.push({ timestamp: '', text: line.trim() });
            }
        }
        
        if (scriptLines.length === 0) {
            setError('Script is empty or in an invalid format.');
            setIsTranslating(false);
            return;
        }

        const textToProcess = scriptLines.map(line => line.text).join('\n');
        let textForVoiceover = textToProcess;
        let langForVoiceover = sourceLang;

        try {
            if (sourceLang !== targetLang) {
                const result = await translateText(textToProcess, sourceLang, targetLang);
                const translatedLines = result.split('\n');

                if (translatedLines.length !== scriptLines.length) {
                    console.warn("Translation line count mismatch. Displaying raw translated text.");
                    setTranslatedScript(result);
                    setStructuredTranslatedScript(null);
                } else {
                    const newStructuredScript = scriptLines.map((line, index) => ({
                        timestamp: line.timestamp,
                        text: translatedLines[index] || '',
                    }));
                    setStructuredTranslatedScript(newStructuredScript);
                }
                
                setTranslatedScript(result);
                textForVoiceover = result;
                langForVoiceover = targetLang;
            } else {
                setTranslatedScript(script);
                setStructuredTranslatedScript(scriptLines);
            }
            setIsTranslating(false);

            setIsGeneratingVoice(true);
            const base64Audio = await generateVoiceover(textForVoiceover, langForVoiceover, selectedChar.voice, selectedEmotion.promptKeyword, selectedChar.description);
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
            setPlaybackMode('voiceover');

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred during the process.');
        } finally {
            setIsTranslating(false);
            setIsGeneratingVoice(false);
        }
    }, [script, videoUrl, sourceLang, targetLang, selectedChar, selectedEmotion, audioUrl]);
    
    const handleDownloadScript = () => {
        let textToDownload = '';
        if (structuredTranslatedScript) {
            textToDownload = structuredTranslatedScript.map(line => `${line.timestamp}: ${line.text}`.trim()).join('\n');
        } else {
            textToDownload = translatedScript.trim() || script.trim();
        }

        if (!textToDownload) return;
        
        const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `video-script-${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadVideo = () => {
        if (!videoUrl || !videoFile) return;
        const link = document.createElement('a');
        link.href = videoUrl;
        link.download = `video_original_${Date.now()}.${videoFile.name.split('.').pop() || 'mp4'}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setVideoFile(null);
        setScript('');
        setTranslatedScript('');
        setStructuredTranslatedScript(null);
        setSourceLang('Khmer');
        setTargetLang('English');
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setPlaybackMode('original');
    };

    const isLoading = isTranslating || isGeneratingVoice;
    
    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col">
            <ClearProjectButton onClick={handleClear} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-4">
                {/* Left Column: Media */}
                <div className={`space-y-4 ${!videoUrl ? 'lg:col-span-2' : ''}`}>
                    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 aspect-video">
                        <h2 className="text-lg font-semibold text-center mb-2 text-gray-300">Video Player</h2>
                        <div className="flex-grow bg-gray-900 rounded-md flex items-center justify-center relative">
                            {videoUrl ? (
                                <video ref={videoRef} src={videoUrl} controls className="object-contain w-full h-full" />
                            ) : (
                                <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer rounded-md border-2 border-dashed border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 transition-all p-6">
                                    <UploadIcon />
                                    <span className="font-semibold text-gray-300">Upload a Video</span>
                                    <input id="video-upload" type="file" className="sr-only" onChange={handleVideoChange} accept="video/*" />
                                </label>
                            )}
                        </div>
                    </div>
                     {audioUrl && (
                        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                            <h3 className="text-lg font-semibold text-gray-300 mb-3 text-center">Playback Mode</h3>
                            <div className="flex items-center gap-2 bg-gray-900 p-1 rounded-lg">
                                <button
                                    onClick={() => setPlaybackMode('original')}
                                    className={`w-full py-2 text-sm font-semibold rounded-md transition ${playbackMode === 'original' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                >
                                    Original Audio
                                </button>
                                <button
                                    onClick={() => setPlaybackMode('voiceover')}
                                    className={`w-full py-2 text-sm font-semibold rounded-md transition ${playbackMode === 'voiceover' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-gray-700'}`}
                                >
                                    New Voiceover
                                </button>
                            </div>
                             <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <button
                                    onClick={handleDownloadVideo}
                                    className="w-full flex items-center justify-center px-4 py-3 font-semibold bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                                >
                                    💾 Download Video
                                </button>
                                <a
                                    href={audioUrl}
                                    download={`voiceover_new_${Date.now()}.wav`}
                                    className="w-full flex items-center justify-center px-4 py-3 font-semibold bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-500 transition"
                                >
                                    🎤 Download Voiceover
                                </a>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">Note: Download video and voiceover, then combine them in a video editor.</p>
                            <audio ref={audioRef} src={audioUrl} className="hidden" />
                        </div>
                     )}
                </div>

                {/* Right Column: Scripts */}
                {videoUrl && (
                    <div className="flex flex-col gap-4 h-[70vh]">
                        <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 flex-1">
                            <h2 className="text-lg font-semibold text-gray-300 mb-2">Original Script</h2>
                            <textarea value={script} onChange={(e) => setScript(e.target.value)} placeholder="Paste the script from your video here... (e.g., 00:01: Hello world)" className="flex-grow w-full bg-gray-900 text-gray-200 rounded-md p-3 resize-y border border-gray-600 focus:ring-2 focus:ring-cyan-500 focus:outline-none" disabled={isLoading}></textarea>
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                <button onClick={handleStart} disabled={isLoading || !script.trim()} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition active:translate-y-0.5 active:border-b-2 disabled:opacity-50">
                                    {isLoading ? <Spinner /> : '▶️' }
                                    {isLoading ? 'Processing...' : 'Start'}
                                </button>
                                <button onClick={handleDownloadScript} disabled={isLoading || (!script && !translatedScript)} className="w-full flex items-center justify-center px-4 py-3 font-semibold bg-gray-600 text-white rounded-lg shadow-md hover:bg-gray-500 disabled:opacity-50 transition">
                                💾 Download Script
                                </button>
                            </div>
                        </div>
                        <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 flex-1">
                            <h2 className="text-lg font-semibold text-gray-300 mb-2">Video Text Translation ({targetLang})</h2>
                            <div className="relative flex-grow bg-gray-900 text-gray-200 rounded-md p-3 border border-gray-600 overflow-y-auto">
                                {isTranslating ? (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md"><Spinner className="h-8 w-8 text-cyan-400" /></div>
                                ) : structuredTranslatedScript ? (
                                    <ul className="space-y-2">
                                        {structuredTranslatedScript.map((line, index) => (
                                            <li key={index} className="flex">
                                                {line.timestamp && <strong className="text-cyan-400 mr-2 min-w-[70px]">{line.timestamp}:</strong>}
                                                <span>{line.text}</span>
                                            </li>
                                        ))}
                                    </ul>
                                ) : translatedScript ? (
                                    <p className="whitespace-pre-wrap">{translatedScript}</p>
                                ) : (
                                    <p className="text-gray-500">Translation will appear here...</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
             {error && (
                <div className="my-2 p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    {error}
                </div>
            )}
            {/* Control Panel */}
            {videoUrl && (
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
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-center mb-2 text-gray-300">🎭 Character Types</h3>
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
                        <h3 className="text-sm font-semibold text-center mb-2 text-gray-300">🎙️ Voice Emotions / Tone Styles</h3>
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                            {voiceEmotions.map(emotion => (
                                <button key={emotion.name} onClick={() => setSelectedEmotion(emotion)} disabled={isLoading} title={emotion.description} className={`p-2 text-sm text-center rounded-lg transition-all transform hover:scale-105 ${selectedEmotion.name === emotion.name ? 'bg-purple-600 text-white ring-2 ring-purple-400' : 'bg-gray-700 text-gray-300'}`}>
                                    <span className="text-2xl block">{emotion.emoji}</span>
                                    <span className="text-xs">{emotion.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VideoTranslatedScript;
