import React, { useState, useRef, useEffect } from 'react';
import { transcribeVideo, translateText, generateVoiceover } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';
import type { PrebuiltVoice } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
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

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
    </svg>
);

const TranslateIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
);

const VoiceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
);

const translationLanguages = [
    { name: 'English', value: 'English' },
    { name: 'Cambodia (Khmer)', value: 'Khmer' },
    { name: 'Korea', value: 'Korean' },
    { name: 'Japan', value: 'Japanese' },
    { name: 'China', value: 'Chinese' },
    { name: 'France', value: 'French' },
    { name: 'Spain', value: 'Spanish' },
    { name: 'Italy', value: 'Italian' },
    { name: 'Portugal', value: 'Portuguese' },
    { name: 'Russia', value: 'Russian' },
];

interface VoiceOption {
    id: string;
    label: string;
    sub: string;
    icon: string;
    voice: PrebuiltVoice;
    style: string;
}

const voiceOptions: VoiceOption[] = [
    { id: 'male', label: 'Male', sub: 'ប្រុស', icon: '👨', voice: 'Kore', style: 'normal' },
    { id: 'female', label: 'Female', sub: 'ស្រី', icon: '👩', voice: 'Charon', style: 'normal' },
    { id: 'child', label: 'Child', sub: 'ក្មេង', icon: '🧒', voice: 'Puck', style: 'child-like, high pitched' },
    { id: 'grandma', label: 'Grandma', sub: 'យាយ', icon: '👵', voice: 'Zephyr', style: 'old woman' },
    { id: 'grandpa', label: 'Grandpa', sub: 'តា', icon: '👴', voice: 'Fenrir', style: 'old man, deep' },
    { id: 'storym', label: 'Storyteller M', sub: 'អ្នកនិទានរឿង', icon: '📖', voice: 'Fenrir', style: 'storytelling' },
    { id: 'storyf', label: 'Storyteller F', sub: 'អ្នកនិទានរឿង', icon: '📚', voice: 'Zephyr', style: 'storytelling' },
    { id: 'news', label: 'News', sub: 'អ្នកអានព័ត៌មាន', icon: '📰', voice: 'Kore', style: 'professional news anchor' },
    { id: 'teacher', label: 'Teacher', sub: 'គ្រូបង្រៀន', icon: '👨‍🏫', voice: 'Charon', style: 'educational, clear' },
    { id: 'robot', label: 'Robot', sub: 'មនុស្សយន្ត', icon: '🤖', voice: 'Puck', style: 'robotic, monotone' },
    { id: 'monster', label: 'Monster', sub: 'បិសាច', icon: '👹', voice: 'Fenrir', style: 'scary, deep growl' },
    { id: 'hero', label: 'Hero', sub: 'វីរបុរស', icon: '🦸', voice: 'Kore', style: 'heroic, brave' },
    { id: 'villain', label: 'Villain', sub: 'តួអាក្រក់', icon: '🦹', voice: 'Fenrir', style: 'evil, sinister' },
    { id: 'happy', label: 'Happy', sub: 'សប្បាយ', icon: '😄', voice: 'Puck', style: 'cheerful, happy' },
    { id: 'sad', label: 'Sad', sub: 'កំសត់', icon: '😢', voice: 'Charon', style: 'sad, melancholic' },
    { id: 'energetic', label: 'Energetic', sub: 'ស្វាហាប់', icon: '⚡', voice: 'Puck', style: 'energetic, fast' },
    { id: 'calm', label: 'Calm', sub: 'ស្ងប់ស្ងាត់', icon: '🍃', voice: 'Zephyr', style: 'calm, soothing' },
    { id: 'whisper', label: 'Whisper', sub: 'ខ្សឹប', icon: '🤫', voice: 'Zephyr', style: 'whispering' },
    { id: 'pro', label: 'Pro', sub: 'អ្នកជំនាញ', icon: '👔', voice: 'Kore', style: 'professional, confident' },
    { id: 'funny', label: 'Funny', sub: 'កំប្លែង', icon: '🤡', voice: 'Puck', style: 'funny, goofy' },
    { id: 'sales', label: 'Sales', sub: 'អ្នកលក់', icon: '💼', voice: 'Charon', style: 'persuasive' },
    { id: 'promo', label: 'Promo', sub: 'ផ្សព្វផ្សាយ', icon: '📢', voice: 'Kore', style: 'exciting, promotional' },
    { id: 'docu', label: 'Docu', sub: 'ឯកសារ', icon: '📽️', voice: 'Fenrir', style: 'documentary, serious' },
    { id: 'assistant', label: 'Assistant', sub: 'ជំនួយការ', icon: '💁', voice: 'Zephyr', style: 'helpful, polite' },
];

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

const VideoTranscriber: React.FC = () => {
    const { t } = useLanguage();
    const [videoFile, setVideoFile] = useState<{ base64: string, mimeType: string } | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [transcription, setTranscription] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isTranslating, setIsTranslating] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    
    // Translation & Voice State
    const [targetLang, setTargetLang] = useState('English');
    const [activeTab, setActiveTab] = useState<'original' | 'translated'>('original');
    const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(voiceOptions[0]);

    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (videoUrl) URL.revokeObjectURL(videoUrl);
            
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setVideoFile({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
                setTranscription('');
                setTranslatedText('');
                setAudioUrl(null);
                setError(null);
                setActiveTab('original');
            };
            reader.onerror = () => setError('Failed to read file.');
            reader.readAsDataURL(file);
        }
    };

    const handleTranscribe = async () => {
        if (!videoFile) return;
        setIsLoading(true);
        setError(null);
        setActiveTab('original');
        setAudioUrl(null);
        try {
            const text = await transcribeVideo(videoFile.base64, videoFile.mimeType);
            setTranscription(text);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Transcription failed.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleTranslate = async () => {
        if (!transcription) return;
        setIsTranslating(true);
        setError(null);
        setActiveTab('translated'); 
        
        try {
            const result = await translateText(transcription, 'the original language', targetLang);
            setTranslatedText(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Translation failed.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleGenerateVoiceover = async () => {
        const rawText = activeTab === 'original' ? transcription : translatedText;
        if (!rawText) return;

        // Clean timestamps and format text as requested: [ 0m0s643ms - 0m3s93ms ] Text -> Text : Text
        const cleanedText = rawText
            .split('\n')
            .map(line => line.replace(/\[\s*\d+m\d+s\d+ms\s*-\s*\d+m\d+s\d+ms\s*\]/g, '').trim())
            .map(line => line.replace(/^\[?\d{2}:\d{2}(?::\d{2})?\]?[-:]?\s*/, '').trim()) // Backup for simple timestamps like [00:01]
            .filter(line => line.length > 0)
            .join(' : ');

        if (!cleanedText) {
             setError('No speech text found after cleaning timestamps.');
             return;
        }

        setIsGeneratingVoice(true);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);

        try {
            // Pass 'clean text', language, mapped voice model, and the specific style prompt
            const base64Audio = await generateVoiceover(
                cleanedText, 
                targetLang, 
                selectedVoice.voice, 
                selectedVoice.style === 'normal' ? undefined : `in a ${selectedVoice.style} tone`
            ); 
            
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Voiceover generation failed.');
        } finally {
            setIsGeneratingVoice(false);
        }
    };

    const handleCopy = () => {
        const textToCopy = activeTab === 'original' ? transcription : translatedText;
        if (!textToCopy) return;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const textToDownload = activeTab === 'original' ? transcription : translatedText;
        if (!textToDownload) return;
        const blob = new Blob([textToDownload], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const suffix = activeTab === 'original' ? '' : `-${targetLang}`;
        link.download = `transcription${suffix}-${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleDownloadVoiceover = () => {
        if (!audioUrl) return;
        const link = document.createElement('a');
        link.href = audioUrl;
        link.download = `transcription-voiceover-${selectedVoice.id}-${Date.now()}.wav`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setVideoFile(null);
        if (videoUrl) URL.revokeObjectURL(videoUrl);
        setVideoUrl(null);
        setTranscription('');
        setTranslatedText('');
        setError(null);
        setActiveTab('original');
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
    };

    const currentText = activeTab === 'original' ? transcription : translatedText;

    return (
        <div className="w-full max-w-6xl mx-auto p-4">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Video Input Section */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-fit">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-4 text-center">
                        {t('tool_video_transcriber')}
                    </h2>
                    
                    <div className="aspect-video bg-gray-900 rounded-lg border border-gray-700 overflow-hidden mb-6 flex items-center justify-center relative">
                        {videoUrl ? (
                            <video src={videoUrl} controls className="w-full h-full object-contain" />
                        ) : (
                            <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-800 transition-colors p-4 text-center">
                                <UploadIcon />
                                <span className="text-gray-400 font-medium mt-2">Upload Video to Transcribe</span>
                                <span className="text-xs text-gray-500 mt-1">MP4, MOV, WEBM</span>
                                <input id="video-upload" type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                            </label>
                        )}
                    </div>

                    <button 
                        onClick={handleTranscribe} 
                        disabled={!videoFile || isLoading}
                        className="w-full py-3 px-6 font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-lg hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Spinner /> : '📝'} 
                        {isLoading ? 'Transcribing...' : t('transcribe_btn')}
                    </button>
                    
                    {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-sm text-center">{error}</div>}
                </div>

                {/* Output Section */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 flex flex-col h-[650px]">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
                            <button
                                onClick={() => setActiveTab('original')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'original' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Original
                            </button>
                            <button
                                onClick={() => setActiveTab('translated')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'translated' ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Translated
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                            <button 
                                onClick={handleCopy} 
                                disabled={!currentText}
                                className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-50"
                                title="Copy to Clipboard"
                            >
                                {copied ? <span className="text-green-400 text-xs font-bold">Copied!</span> : <CopyIcon />}
                            </button>
                            <button 
                                onClick={handleDownload} 
                                disabled={!currentText}
                                className="px-3 py-1.5 text-xs font-bold text-white bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-50"
                            >
                                Download
                            </button>
                        </div>
                    </div>

                    {/* Translation Controls - Visible only on Translated Tab */}
                    {activeTab === 'translated' && (
                        <div className="mb-3 flex items-center gap-2 bg-gray-700/30 p-2 rounded-lg border border-gray-600/50">
                            <select 
                                value={targetLang} 
                                onChange={(e) => setTargetLang(e.target.value)}
                                className="bg-gray-900 text-white text-xs p-1.5 rounded border border-gray-600 outline-none focus:border-indigo-500"
                            >
                                {translationLanguages.map(lang => (
                                    <option key={lang.value} value={lang.value}>{lang.name}</option>
                                ))}
                            </select>
                            <button 
                                onClick={handleTranslate} 
                                disabled={isTranslating || !transcription}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition shadow-sm disabled:opacity-50 ml-auto"
                            >
                                {isTranslating ? <Spinner className="h-3 w-3 mr-0"/> : <TranslateIcon />}
                                {isTranslating ? 'Translating...' : 'Translate'}
                            </button>
                        </div>
                    )}
                    
                    <div className="flex-grow bg-gray-900 rounded-lg p-4 overflow-y-auto border border-gray-700 font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap relative">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Spinner className="h-8 w-8 text-cyan-500 mb-2" />
                                <p>Listening to video...</p>
                            </div>
                        ) : isTranslating ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Spinner className="h-8 w-8 text-indigo-500 mb-2" />
                                <p>Translating...</p>
                            </div>
                        ) : currentText ? (
                            currentText
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500 italic">
                                <p>{activeTab === 'original' ? 'Transcription will appear here.' : 'Translation will appear here.'}</p>
                            </div>
                        )}
                    </div>

                    {/* Voiceover Section */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-semibold text-gray-400 mb-2">Voice Type (ប្រភេទសំឡេង)</h3>
                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                            {voiceOptions.map((option) => (
                                <button
                                    key={option.id}
                                    onClick={() => setSelectedVoice(option)}
                                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${selectedVoice.id === option.id ? 'bg-purple-600/20 border-purple-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}
                                    title={option.style}
                                >
                                    <span className="text-xl mb-1">{option.icon}</span>
                                    <span className="text-[10px] font-bold leading-tight">{option.label}</span>
                                    <span className="text-[8px] opacity-70 leading-tight">{option.sub}</span>
                                </button>
                            ))}
                        </div>
                        
                        <div className="flex gap-2">
                             <button 
                                onClick={handleGenerateVoiceover}
                                disabled={!currentText || isGeneratingVoice}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold text-white bg-purple-600 rounded-lg hover:bg-purple-500 transition disabled:opacity-50 shadow-lg"
                            >
                                {isGeneratingVoice ? <Spinner className="h-4 w-4"/> : <VoiceIcon />}
                                {isGeneratingVoice ? 'Generating...' : 'Generate Voiceover'}
                            </button>
                            {audioUrl && (
                                <button 
                                    onClick={handleDownloadVoiceover}
                                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-lg flex items-center"
                                    title="Download Audio"
                                >
                                    💾
                                </button>
                            )}
                        </div>
                        {audioUrl && (
                            <audio controls src={audioUrl} className="w-full mt-3 h-8" />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoTranscriber;