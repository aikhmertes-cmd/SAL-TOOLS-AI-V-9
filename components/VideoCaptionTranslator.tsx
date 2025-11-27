
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { transcribeVideo, translateText, generateVoiceover } from '../services/geminiService.ts';
import type { PrebuiltVoice } from '../services/geminiService.ts';

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
  </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
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

const languages = [
    { name: 'United States (English)', value: 'English', flag: '🇺🇸' },
    { name: 'United Kingdom (English)', value: 'English', flag: '🇬🇧' },
    { name: 'Cambodia (Khmer)', value: 'Khmer', flag: '🇰🇭' },
    { name: 'France (French)', value: 'French', flag: '🇫🇷' },
    { name: 'Germany (German)', value: 'German', flag: '🇩🇪' },
    { name: 'Spain (Spanish)', value: 'Spanish', flag: '🇪🇸' },
    { name: 'Italy (Italian)', value: 'Italian', flag: '🇮🇹' },
    { name: 'Portugal (Portuguese)', value: 'Portuguese', flag: '🇵🇹' },
    { name: 'Russia (Russian)', value: 'Russian', flag: '🇷🇺' },
    { name: 'China (Mandarin)', value: 'Chinese', flag: '🇨🇳' },
    { name: 'Japan (Japanese)', value: 'Japanese', flag: '🇯🇵' },
    { name: 'South Korea (Korean)', value: 'Korean', flag: '🇰🇷' },
    { name: 'Thailand (Thai)', value: 'Thai', flag: '🇹🇭' },
    { name: 'Vietnam (Vietnamese)', value: 'Vietnamese', flag: '🇻🇳' },
    { name: 'India (Hindi)', value: 'Hindi', flag: '🇮🇳' },
    { name: 'Indonesia (Indonesian)', value: 'Indonesian', flag: '🇮🇩' },
    { name: 'Philippines (Filipino)', value: 'Filipino', flag: '🇵🇭' },
    { name: 'Laos (Lao)', value: 'Lao', flag: '🇱🇦' },
    { name: 'Saudi Arabia (Arabic)', value: 'Arabic', flag: '🇸🇦' },
    { name: 'Brazil (Portuguese)', value: 'Portuguese', flag: '🇧🇷' },
];

interface VoiceOption {
    id: string;
    label: string;
    icon: string;
    voice: PrebuiltVoice;
    style: string;
}

const voiceOptions: VoiceOption[] = [
    { id: 'male1', label: 'Male 1 (Kore)', icon: '👨', voice: 'Kore', style: 'normal' },
    { id: 'female1', label: 'Female 1 (Charon)', icon: '👩', voice: 'Charon', style: 'normal' },
    { id: 'male2', label: 'Male 2 (Fenrir)', icon: '👴', voice: 'Fenrir', style: 'deep' },
    { id: 'female2', label: 'Female 2 (Zephyr)', icon: '👱‍♀️', voice: 'Zephyr', style: 'soft' },
    { id: 'child', label: 'Child (Puck)', icon: '🧒', voice: 'Puck', style: 'energetic' },
];

// --- Caption Styles ---
interface CaptionStyle {
    id: string;
    name: string;
    textColor: string;
    fontFamily: string;
    fontWeight: string;
    strokeColor?: string;
    strokeWidth?: number; // relative to fontSize, typically 0.1-0.2
    backgroundColor?: string;
    backgroundPadding?: number; // relative to fontSize
    borderRadius?: number; // relative to fontSize
    shadowColor?: string;
    shadowBlur?: number;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    isNeon?: boolean;
    fontStyle?: string;
}

const captionStyles: CaptionStyle[] = [
    { id: 'classic', name: 'Classic', textColor: '#FFFFFF', fontFamily: 'Arial', fontWeight: 'bold', strokeColor: '#000000', strokeWidth: 0.1, shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 4, shadowOffsetY: 2 },
    { id: 'yellow', name: 'Yellow Pop', textColor: '#FACC15', fontFamily: 'Arial', fontWeight: 'bold', strokeColor: '#000000', strokeWidth: 0.15, shadowColor: '#000000', shadowOffsetY: 4, shadowBlur: 0 },
    { id: 'black_box', name: 'Black Box', textColor: '#FFFFFF', fontFamily: 'Verdana', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.8)', backgroundPadding: 0.3 },
    { id: 'white_box', name: 'White Box', textColor: '#000000', fontFamily: 'Verdana', fontWeight: 'bold', backgroundColor: 'rgba(255,255,255,0.9)', backgroundPadding: 0.3 },
    { id: 'neon_blue', name: 'Neon Blue', textColor: '#FFFFFF', fontFamily: 'Courier New', fontWeight: 'bold', strokeColor: '#00FFFF', strokeWidth: 0.05, shadowColor: '#00FFFF', shadowBlur: 15, isNeon: true },
    { id: 'neon_pink', name: 'Neon Pink', textColor: '#FFFFFF', fontFamily: 'Courier New', fontWeight: 'bold', strokeColor: '#FF00FF', strokeWidth: 0.05, shadowColor: '#FF00FF', shadowBlur: 15, isNeon: true },
    { id: 'neon_green', name: 'Neon Green', textColor: '#FFFFFF', fontFamily: 'Courier New', fontWeight: 'bold', strokeColor: '#00FF00', strokeWidth: 0.05, shadowColor: '#00FF00', shadowBlur: 15, isNeon: true },
    { id: 'red_bold', name: 'Red Alert', textColor: '#FF0000', fontFamily: 'Impact', fontWeight: 'bold', strokeColor: '#FFFFFF', strokeWidth: 0.05, shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 5 },
    { id: 'cinematic', name: 'Cinematic', textColor: '#E5E7EB', fontFamily: 'Georgia', fontWeight: 'normal', fontStyle: 'italic', shadowColor: 'rgba(0,0,0,0.8)', shadowBlur: 4, shadowOffsetY: 2 },
    { id: 'minimal', name: 'Minimal', textColor: '#333333', fontFamily: 'Helvetica', fontWeight: '300', backgroundColor: 'rgba(255,255,255,0.7)', backgroundPadding: 0.2, borderRadius: 0.1 },
    { id: 'comic', name: 'Comic', textColor: '#FFD700', fontFamily: 'Comic Sans MS', fontWeight: 'bold', strokeColor: '#000000', strokeWidth: 0.2, shadowColor: '#000000', shadowOffsetY: 5, shadowOffsetX: 3, shadowBlur: 0 },
    { id: 'blue_box', name: 'Blue Box', textColor: '#FFFFFF', fontFamily: 'Arial', fontWeight: 'bold', backgroundColor: '#1D4ED8', backgroundPadding: 0.2, borderRadius: 0.2 },
    { id: 'red_box', name: 'Red Box', textColor: '#FFFFFF', fontFamily: 'Arial', fontWeight: 'bold', backgroundColor: '#B91C1C', backgroundPadding: 0.2, borderRadius: 0.2 },
    { id: 'green_box', name: 'Green Box', textColor: '#FFFFFF', fontFamily: 'Arial', fontWeight: 'bold', backgroundColor: '#047857', backgroundPadding: 0.2, borderRadius: 0.2 },
    { id: 'yellow_box', name: 'Yellow Box', textColor: '#000000', fontFamily: 'Arial', fontWeight: 'bold', backgroundColor: '#FACC15', backgroundPadding: 0.2, borderRadius: 0.2 },
    { id: 'purple_stroke', name: 'Purple Edge', textColor: '#FFFFFF', fontFamily: 'Arial', fontWeight: 'bold', strokeColor: '#7C3AED', strokeWidth: 0.2, shadowColor: '#000000', shadowBlur: 2 },
    { id: 'orange_crush', name: 'Orange', textColor: '#F97316', fontFamily: 'Impact', fontWeight: 'bold', strokeColor: '#000000', strokeWidth: 0.1, shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 5 },
    { id: 'typewriter', name: 'Typewriter', textColor: '#10B981', fontFamily: 'Courier', fontWeight: 'bold', backgroundColor: '#000000', backgroundPadding: 0.2 },
    { id: 'soft_shadow', name: 'Soft Shadow', textColor: '#FFFFFF', fontFamily: 'Arial', fontWeight: 'bold', shadowColor: 'rgba(0,0,0,0.5)', shadowBlur: 8, shadowOffsetY: 4 },
    { id: 'high_contrast', name: 'High Contrast', textColor: '#000000', fontFamily: 'Arial', fontWeight: '900', strokeColor: '#FACC15', strokeWidth: 0.1 },
    { id: 'vlog', name: 'Vlog', textColor: '#FFFFFF', fontFamily: 'Helvetica', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.4)', backgroundPadding: 0.4, borderRadius: 0.5 },
    { id: 'news_ticker', name: 'News Ticker', textColor: '#FFFFFF', fontFamily: 'Arial', fontWeight: 'bold', backgroundColor: '#DC2626', backgroundPadding: 0.1 },
    { id: 'retro', name: 'Retro', textColor: '#FF00FF', fontFamily: 'Courier New', fontWeight: 'bold', shadowColor: '#00FFFF', shadowOffsetX: 2, shadowOffsetY: 2, shadowBlur: 0 },
    { id: 'gamer', name: 'Gamer', textColor: '#00FF00', fontFamily: 'Verdana', fontWeight: 'bold', strokeColor: '#000000', strokeWidth: 0.2 },
    { id: 'luxury', name: 'Luxury', textColor: '#D4AF37', fontFamily: 'Times New Roman', fontWeight: 'normal', fontStyle: 'italic', shadowColor: '#000000', shadowBlur: 2 },
];

interface Subtitle {
    startTime: number;
    text: string;
}

const VideoCaptionTranslator: React.FC = () => {
    const [videoFile, setVideoFile] = useState<{ base64: string, mimeType: string } | null>(null);
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    
    const [selectedLanguage, setSelectedLanguage] = useState(languages[0]);
    
    const [result, setResult] = useState('');
    const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
    const [currentSubtitle, setCurrentSubtitle] = useState('');
    const [showCaptions, setShowCaptions] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingVoice, setIsGeneratingVoice] = useState(false);
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [selectedVoice, setSelectedVoice] = useState<VoiceOption>(voiceOptions[0]);
    const [playbackMode, setPlaybackMode] = useState<'original' | 'voiceover'>('original');
    const [autoGenerateVoice, setAutoGenerateVoice] = useState(false);
    
    // Style State
    const [activeCaptionStyle, setActiveCaptionStyle] = useState<CaptionStyle>(captionStyles[0]);

    // Export States
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportRatio, setExportRatio] = useState<'original' | '16:9' | '9:16' | '480p' | '720p' | '1080p' | '2k'>('original');
    
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        return () => { if (videoUrl) URL.revokeObjectURL(videoUrl); };
    }, [videoUrl]);

    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);

    useEffect(() => {
        const video = previewVideoRef.current;
        const audio = audioRef.current;
        
        if (!video || !audio) return;

        const handlePlay = () => {
            if (playbackMode === 'voiceover' && audioUrl) {
                audio.play().catch(() => {});
            }
        };
        const handlePause = () => {
            if (playbackMode === 'voiceover') {
                audio.pause();
            }
        };
        const handleSeek = () => {
            if (playbackMode === 'voiceover' && Math.abs(audio.currentTime - video.currentTime) > 0.5) {
                audio.currentTime = video.currentTime;
            }
        };
        const handleTimeUpdate = () => {
            const time = video.currentTime;
            const activeSub = subtitles.find(s => time >= s.startTime && time < s.startTime + 5);
            if (activeSub) {
                 setCurrentSubtitle(activeSub.text);
            } else {
                setCurrentSubtitle('');
            }
        };

        video.muted = playbackMode === 'voiceover' && !!audioUrl;

        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);
        video.addEventListener('seeking', handleSeek);
        video.addEventListener('timeupdate', handleTimeUpdate);

        return () => {
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
            video.removeEventListener('seeking', handleSeek);
            video.removeEventListener('timeupdate', handleTimeUpdate);
        };
    }, [audioUrl, subtitles, playbackMode]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setVideoFile({
                    base64: base64String.split(',')[1],
                    mimeType: file.type
                });
                setResult('');
                setSubtitles([]);
                setError(null);
                setAudioUrl(null);
                setPlaybackMode('original');
            };
            reader.onerror = () => setError('Failed to read file.');
            reader.readAsDataURL(file);
        }
    };

    const parseSubtitles = (text: string): Subtitle[] => {
        const lines = text.split('\n');
        const subs: Subtitle[] = [];
        const timeRegex = /(?:\[)?(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\])?/;

        lines.forEach(line => {
            const match = line.match(timeRegex);
            if (match) {
                let minutes = 0;
                let seconds = 0;
                if (match[3]) {
                     minutes = parseInt(match[1]) * 60 + parseInt(match[2]);
                     seconds = parseInt(match[3]);
                } else {
                     minutes = parseInt(match[1]);
                     seconds = parseInt(match[2]);
                }
                const startTime = minutes * 60 + seconds;
                const cleanText = line.replace(timeRegex, '').replace(/^[\s\-\:\]\)]+/, '').trim();
                if (cleanText) subs.push({ startTime, text: cleanText });
            }
        });
        return subs;
    };

    const handleGenerateVoice = useCallback(async (textToSpeak: string) => {
        setIsGeneratingVoice(true);
        setError(null);
        try {
            const cleanTextForVoice = textToSpeak
                                      .replace(/(?:\[)?\d{1,2}:\d{2}(?::\d{2})?(?:\])?/g, '')
                                      .replace(/[\n\r]+/g, '. ');

            const base64Audio = await generateVoiceover(
                cleanTextForVoice, 
                selectedLanguage.value, 
                selectedVoice.voice, 
                selectedVoice.style === 'normal' ? undefined : `Speak in a ${selectedVoice.style} tone`
            );
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
            setPlaybackMode('voiceover');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate voiceover.');
        } finally {
            setIsGeneratingVoice(false);
        }
    }, [selectedLanguage, selectedVoice]);

    const handleProcess = useCallback(async () => {
        if (!videoFile) {
            setError('Please upload a video first.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setResult('');
        setAudioUrl(null);
        setSubtitles([]);
        setPlaybackMode('original');
        
        try {
            setStatus('Transcribing video audio...');
            const transcription = await transcribeVideo(videoFile.base64, videoFile.mimeType);

            setStatus(`Translating caption to ${selectedLanguage.name}...`);
            const translationResult = await translateText(
                `Translate the following video captions into ${selectedLanguage.value}. 
                CRITICAL OUTPUT FORMAT:
                [MM:SS] Translated Text
                Original Text:
                ${transcription}`,
                'Detected Language',
                selectedLanguage.value
            );
            
            setResult(translationResult);
            const parsedSubs = parseSubtitles(translationResult);
            setSubtitles(parsedSubs);

            if (autoGenerateVoice) {
                setStatus('Generating new voiceover...');
                await handleGenerateVoice(translationResult);
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    }, [videoFile, selectedLanguage, autoGenerateVoice, handleGenerateVoice]);

    const handleExportVideo = async () => {
        if (!videoUrl || !audioUrl) {
            setError("Please ensure you have generated the translation and voiceover first.");
            return;
        }
        setIsExporting(true);
        setExportProgress(0);

        try {
            const video = document.createElement('video');
            video.src = videoUrl;
            video.muted = true;
            video.crossOrigin = "anonymous";
            
            const audio = new Audio(audioUrl);
            audio.crossOrigin = "anonymous";

            await Promise.all([
                new Promise(r => { video.onloadedmetadata = r; }),
                new Promise(r => { audio.onloadedmetadata = r; })
            ]);

            const canvas = document.createElement('canvas');
            let width = video.videoWidth;
            let height = video.videoHeight;

            // Resolution Logic
            if (exportRatio === '480p') { height = 480; width = 480 * (video.videoWidth / video.videoHeight); }
            else if (exportRatio === '720p') { height = 720; width = 720 * (video.videoWidth / video.videoHeight); }
            else if (exportRatio === '1080p') { height = 1080; width = 1080 * (video.videoWidth / video.videoHeight); }
            else if (exportRatio === '2k') { height = 1440; width = 1440 * (video.videoWidth / video.videoHeight); }
            else if (exportRatio === '16:9') {
                // Force 16:9 logic
                height = width * (9/16);
            } else if (exportRatio === '9:16') {
                // Force 9:16 logic
                const targetWidth = height * (9/16);
                width = targetWidth;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not get canvas context");

            const audioCtx = new AudioContext();
            const dest = audioCtx.createMediaStreamDestination();
            const source = audioCtx.createMediaElementSource(audio);
            source.connect(dest);

            const stream = canvas.captureStream(30);
            const audioTrack = dest.stream.getAudioTracks()[0];
            stream.addTrack(audioTrack);
            
            const recorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => { if(e.data.size > 0) chunks.push(e.data); };
            
            recorder.onstop = () => {
                const blob = new Blob(chunks, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `translated_video_${exportRatio}_${Date.now()}.webm`;
                a.click();
                setIsExporting(false);
                audioCtx.close();
            };

            recorder.start();
            video.play();
            audio.play();

            const drawFrame = () => {
                if (video.paused || video.ended) {
                    if(recorder.state === 'recording') recorder.stop();
                    return;
                }
                
                // Draw Video
                const hRatio = canvas.width / video.videoWidth;
                const vRatio = canvas.height / video.videoHeight;
                const ratio = Math.max(hRatio, vRatio);
                const centerShift_x = (canvas.width - video.videoWidth * ratio) / 2;
                const centerShift_y = (canvas.height - video.videoHeight * ratio) / 2;  
                
                ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight,
                                   centerShift_x, centerShift_y, video.videoWidth * ratio, video.videoHeight * ratio);

                // Draw Subtitles based on Active Style
                const time = video.currentTime;
                const activeSub = subtitles.find(s => time >= s.startTime && time < s.startTime + 5);

                if (activeSub) {
                    const style = activeCaptionStyle;
                    const fontSize = Math.max(20, canvas.height * 0.05); // Responsive font size
                    
                    ctx.font = `${style.fontStyle || ''} ${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    
                    const text = activeSub.text;
                    const x = canvas.width / 2;
                    const y = canvas.height - (canvas.height * 0.1);
                    
                    // Text Measurement for Background
                    const metrics = ctx.measureText(text);
                    const textWidth = metrics.width;
                    const textHeight = fontSize; // Approx
                    
                    // Background Box
                    if (style.backgroundColor) {
                        const padding = fontSize * (style.backgroundPadding || 0.2);
                        const radius = fontSize * (style.borderRadius || 0);
                        
                        ctx.fillStyle = style.backgroundColor;
                        
                        // Simple rect for now, or rounded if complex drawing added
                        const bgX = x - textWidth / 2 - padding;
                        const bgY = y - textHeight - padding + (fontSize * 0.2); // adjust baseline offset
                        const bgW = textWidth + padding * 2;
                        const bgH = textHeight + padding * 2;
                        
                        ctx.fillRect(bgX, bgY, bgW, bgH);
                    }

                    // Shadow
                    if (style.shadowColor) {
                        ctx.shadowColor = style.shadowColor;
                        ctx.shadowBlur = style.shadowBlur || 0;
                        ctx.shadowOffsetX = style.shadowOffsetX || 0;
                        ctx.shadowOffsetY = style.shadowOffsetY || 0;
                    } else {
                        ctx.shadowColor = 'transparent';
                    }

                    // Stroke
                    if (style.strokeColor) {
                        ctx.lineWidth = fontSize * (style.strokeWidth || 0.1);
                        ctx.strokeStyle = style.strokeColor;
                        ctx.strokeText(text, x, y);
                    }

                    // Fill
                    ctx.fillStyle = style.textColor;
                    ctx.fillText(text, x, y);
                    
                    // Reset shadow for next frame
                    ctx.shadowColor = 'transparent';
                }

                setExportProgress((video.currentTime / video.duration) * 100);
                
                if (!video.ended) {
                    requestAnimationFrame(drawFrame);
                }
            };
            
            drawFrame();

        } catch (err) {
            console.error(err);
            setError("Export failed. Please try again.");
            setIsExporting(false);
        }
    };

    const handleClear = () => {
        setVideoUrl(null);
        setVideoFile(null);
        setResult('');
        setSubtitles([]);
        setAudioUrl(null);
        setError(null);
        setPlaybackMode('original');
    };

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Source Video & Controls */}
                <div className="space-y-6">
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-full flex flex-col">
                        <h3 className="text-lg font-bold text-cyan-400 mb-4 flex items-center gap-2">
                            <span>📹</span> បញ្ចូលវីដេអូដើម (Source Video)
                        </h3>
                        
                        <div className="flex-grow bg-gray-900 rounded-lg border border-gray-700 overflow-hidden flex items-center justify-center relative mb-6 min-h-[300px]">
                            {videoUrl ? (
                                <video src={videoUrl} controls className="w-full h-full object-contain max-h-[400px]" />
                            ) : (
                                <label htmlFor="video-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-800 transition-colors p-10 text-center">
                                    <UploadIcon />
                                    <span className="text-gray-400 font-medium mt-2">Click to Upload Video</span>
                                    <span className="text-xs text-gray-500 mt-1">Supports MP4, MOV, WEBM</span>
                                    <input id="video-upload" type="file" accept="video/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-300">Select Target Language</label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                                    {languages.map((lang, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setSelectedLanguage(lang)}
                                            className={`relative flex flex-col items-center justify-center p-3 rounded-xl border transition-all duration-200 group ${
                                                selectedLanguage.name === lang.name 
                                                ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white border-transparent shadow-lg shadow-blue-500/50 transform scale-105 ring-2 ring-blue-400' 
                                                : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:border-gray-500'
                                            }`}
                                        >
                                            <span className="text-2xl mb-1 drop-shadow-md">{lang.flag}</span>
                                            <span className="text-[10px] font-bold text-center leading-tight">{lang.name}</span>
                                            {selectedLanguage.name === lang.name && (
                                                <div className="absolute inset-0 rounded-xl bg-white/10 animate-pulse pointer-events-none"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-gray-700/30 p-3 rounded-lg border border-gray-600">
                                <input 
                                    type="checkbox" 
                                    id="autoVoice" 
                                    checked={autoGenerateVoice} 
                                    onChange={e => setAutoGenerateVoice(e.target.checked)}
                                    className="w-5 h-5 text-purple-600 bg-gray-800 border-gray-600 rounded focus:ring-purple-500 cursor-pointer"
                                />
                                <label htmlFor="autoVoice" className="text-sm text-gray-300 cursor-pointer select-none font-medium">
                                    Auto-generate Voiceover
                                </label>
                            </div>

                            <button 
                                onClick={handleProcess} 
                                disabled={isLoading || !videoFile}
                                className="w-full py-3 px-6 font-bold text-white bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg shadow-lg hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Spinner /> : '✨'} 
                                {isLoading ? status : 'Translate Captions'}
                            </button>
                        </div>
                        
                        {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-sm text-center">{error}</div>}
                    </div>
                </div>

                {/* Right Column: Result Output */}
                <div className="space-y-6">
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-full flex flex-col">
                        <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                            <span>🎬</span> លទ្ធផល (Result Output)
                        </h3>

                        {/* Preview Player */}
                        <div className="flex-grow bg-gray-900 rounded-lg border border-gray-700 overflow-hidden flex items-center justify-center relative mb-6 min-h-[300px]">
                            {videoUrl ? (
                                <div className="relative w-full h-full flex items-center justify-center bg-black">
                                    <video 
                                        ref={previewVideoRef} 
                                        src={videoUrl} 
                                        className="w-full h-full object-contain max-h-[400px]" 
                                        controls 
                                    />
                                    {/* Styled Caption Overlay */}
                                    {showCaptions && currentSubtitle && (
                                        <div className="absolute bottom-8 left-0 right-0 text-center px-4 pointer-events-none z-20">
                                            <span 
                                                className="inline-block px-4 py-2 rounded-md transition-all duration-200"
                                                style={{
                                                    color: activeCaptionStyle.textColor,
                                                    fontFamily: activeCaptionStyle.fontFamily,
                                                    fontWeight: activeCaptionStyle.fontWeight,
                                                    fontStyle: activeCaptionStyle.fontStyle,
                                                    backgroundColor: activeCaptionStyle.backgroundColor || 'transparent',
                                                    textShadow: activeCaptionStyle.shadowColor 
                                                        ? `${activeCaptionStyle.shadowOffsetX || 0}px ${activeCaptionStyle.shadowOffsetY || 0}px ${activeCaptionStyle.shadowBlur || 0}px ${activeCaptionStyle.shadowColor}` 
                                                        : 'none',
                                                    WebkitTextStroke: activeCaptionStyle.strokeColor ? `${activeCaptionStyle.strokeWidth ? activeCaptionStyle.strokeWidth * 20 : 1}px ${activeCaptionStyle.strokeColor}` : 'none',
                                                    boxShadow: activeCaptionStyle.isNeon ? `0 0 10px ${activeCaptionStyle.strokeColor}, 0 0 20px ${activeCaptionStyle.strokeColor}` : 'none',
                                                    fontSize: '1.25rem',
                                                    lineHeight: '1.5'
                                                }}
                                            >
                                                {currentSubtitle}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-gray-500 p-10">
                                    <span className="text-4xl block mb-2">📺</span>
                                    <p>Preview will appear here.</p>
                                </div>
                            )}
                            
                            {isExporting && (
                                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center z-50">
                                    <Spinner className="h-10 w-10 text-green-500 mb-4" />
                                    <h4 className="text-xl font-bold text-white mb-2">Rendering Final Video...</h4>
                                    <p className="text-gray-400 text-sm mb-4">Mixing Video + Audio + Custom Captions</p>
                                    <div className="w-64 bg-gray-700 rounded-full h-2.5">
                                        <div className="bg-green-500 h-2.5 rounded-full transition-all duration-200" style={{ width: `${exportProgress}%` }}></div>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">{Math.round(exportProgress)}%</p>
                                </div>
                            )}
                        </div>

                        {/* Controls Section */}
                        {result && !isLoading && (
                            <div className="space-y-4 animate-fade-in">
                                {/* Toggle Buttons */}
                                <div className="flex flex-wrap justify-between gap-2 bg-gray-900 p-2 rounded-lg border border-gray-700">
                                    <button 
                                        onClick={() => setShowCaptions(!showCaptions)}
                                        className={`flex-1 py-2 px-3 text-xs font-bold rounded transition ${showCaptions ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                                    >
                                        {showCaptions ? 'CC: ON' : 'CC: OFF'}
                                    </button>
                                    <div className="w-px bg-gray-700 mx-1"></div>
                                    <button 
                                        onClick={() => setPlaybackMode('original')}
                                        className={`flex-1 py-2 px-3 text-xs font-bold rounded transition ${playbackMode === 'original' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                                    >
                                        Original Audio
                                    </button>
                                    <button 
                                        onClick={() => setPlaybackMode('voiceover')}
                                        disabled={!audioUrl}
                                        className={`flex-1 py-2 px-3 text-xs font-bold rounded transition ${playbackMode === 'voiceover' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400'}`}
                                    >
                                        New Voiceover
                                    </button>
                                </div>

                                {/* Style Selector */}
                                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-3">Caption Style</h4>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                        {captionStyles.map(style => (
                                            <button
                                                key={style.id}
                                                onClick={() => setActiveCaptionStyle(style)}
                                                className={`relative h-12 rounded-md flex items-center justify-center border transition-all ${activeCaptionStyle.id === style.id ? 'border-cyan-400 ring-1 ring-cyan-400' : 'border-gray-600 hover:border-gray-400'}`}
                                                style={{ backgroundColor: '#1f2937' }}
                                                title={style.name}
                                            >
                                                <span 
                                                    style={{
                                                        color: style.textColor,
                                                        fontFamily: style.fontFamily,
                                                        fontWeight: style.fontWeight,
                                                        fontStyle: style.fontStyle,
                                                        fontSize: '12px',
                                                        backgroundColor: style.backgroundColor || 'transparent',
                                                        padding: style.backgroundColor ? '2px 4px' : '0',
                                                        borderRadius: style.borderRadius ? '2px' : '0',
                                                        textShadow: style.shadowColor ? `1px 1px 0 ${style.shadowColor}` : 'none',
                                                        WebkitTextStroke: style.strokeColor ? `0.5px ${style.strokeColor}` : 'none',
                                                    }}
                                                >
                                                    Aa
                                                </span>
                                                {activeCaptionStyle.id === style.id && (
                                                    <div className="absolute top-0 right-0 w-2 h-2 bg-cyan-400 rounded-full"></div>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Voice & Export */}
                                <div className="p-4 bg-gray-900 rounded-lg border border-gray-700 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <label className="text-sm font-semibold text-gray-300 whitespace-nowrap">Dubbing Voice:</label>
                                        <select 
                                            value={selectedVoice.id} 
                                            onChange={(e) => {
                                                const voice = voiceOptions.find(v => v.id === e.target.value);
                                                if (voice) setSelectedVoice(voice);
                                            }}
                                            className="bg-gray-700 text-white text-xs p-2 rounded border border-gray-600 outline-none flex-grow"
                                        >
                                            {voiceOptions.map(v => (
                                                <option key={v.id} value={v.id}>{v.icon} {v.label}</option>
                                            ))}
                                        </select>
                                        <button 
                                            onClick={() => handleGenerateVoice(result)}
                                            disabled={isGeneratingVoice}
                                            className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold text-white bg-purple-600 rounded hover:bg-purple-500 transition disabled:opacity-50"
                                        >
                                            {isGeneratingVoice ? <Spinner className="h-3 w-3"/> : '🔄 Regenerate'}
                                        </button>
                                    </div>
                                    
                                    <div className="border-t border-gray-700 pt-4">
                                        <h4 className="text-sm font-bold text-gray-300 mb-3 text-center">Download Final Video</h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                            {['480p', '720p', '1080p', '2k'].map((res) => (
                                                <button 
                                                    key={res}
                                                    onClick={() => setExportRatio(res as any)} 
                                                    className={`px-2 py-1.5 text-[10px] font-bold rounded border transition ${exportRatio === res ? 'bg-green-600 text-white border-green-500' : 'bg-gray-800 text-gray-400 border-gray-600 hover:bg-gray-700'}`}
                                                >
                                                    {res.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex justify-center gap-2 mb-3">
                                            <button onClick={() => setExportRatio('original')} className={`px-3 py-1.5 text-xs font-medium rounded border transition ${exportRatio === 'original' ? 'bg-gray-700 border-green-500 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}`}>Full Size</button>
                                            <button onClick={() => setExportRatio('16:9')} className={`px-3 py-1.5 text-xs font-medium rounded border transition ${exportRatio === '16:9' ? 'bg-gray-700 border-green-500 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}`}>16:9</button>
                                            <button onClick={() => setExportRatio('9:16')} className={`px-3 py-1.5 text-xs font-medium rounded border transition ${exportRatio === '9:16' ? 'bg-gray-700 border-green-500 text-white' : 'border-gray-600 text-gray-400 hover:bg-gray-800'}`}>9:16</button>
                                        </div>

                                        <div className="flex gap-3">
                                            {audioUrl && (
                                                <a 
                                                    href={audioUrl}
                                                    download={`dubbing-${selectedLanguage.value}-${Date.now()}.wav`}
                                                    className="flex-1 flex items-center justify-center px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition shadow-md text-xs"
                                                >
                                                    <DownloadIcon /> <span className="ml-2">Audio Only</span>
                                                </a>
                                            )}
                                            <button 
                                                onClick={handleExportVideo}
                                                disabled={isExporting || !audioUrl}
                                                className="flex-[2] flex items-center justify-center px-4 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isExporting ? <Spinner /> : <DownloadIcon />}
                                                <span className="ml-2">Download Final Video</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                {audioUrl && (
                                    <audio ref={audioRef} src={audioUrl} className="hidden" />
                                )}
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default VideoCaptionTranslator;
