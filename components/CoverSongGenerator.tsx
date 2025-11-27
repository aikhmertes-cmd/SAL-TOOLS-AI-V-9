import React, { useState, useRef, useEffect } from 'react';
import { extractLyricsFromMedia, translateSongLyrics, generateLyricsFromTitle } from '../services/geminiService.ts';
import { useLanguage } from './LanguageContext.tsx';

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
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
  </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
    </svg>
);

const languages = [
    { name: 'Cambodia (Khmer)', value: 'Khmer' },
    { name: 'United States (English)', value: 'American English' },
    { name: 'United Kingdom (English)', value: 'British English' },
    { name: 'Australia (English)', value: 'Australian English' },
    { name: 'Canada (English)', value: 'Canadian English' },
    { name: 'New Zealand (English)', value: 'New Zealand English' },
    { name: 'Vietnam (Vietnamese)', value: 'Vietnamese' },
    { name: 'Laos (Lao)', value: 'Lao' },
    { name: 'Thailand (Thai)', value: 'Thai' },
    { name: 'Malaysia (Malay)', value: 'Malay' },
    { name: 'Singapore (English)', value: 'Singaporean English' },
    { name: 'Indonesia (Indonesian)', value: 'Indonesian' },
    { name: 'Philippines (Filipino)', value: 'Filipino' },
    { name: 'Myanmar (Burmese)', value: 'Burmese' },
    { name: 'China (Chinese)', value: 'Mandarin Chinese' },
    { name: 'Japan (Japanese)', value: 'Japanese' },
    { name: 'South Korea (Korean)', value: 'Korean' },
    { name: 'India (Hindi)', value: 'Hindi' },
    { name: 'Nepal (Nepali)', value: 'Nepali' },
    { name: 'Sri Lanka (Sinhala)', value: 'Sinhala' },
    { name: 'Mexico (Spanish)', value: 'Mexican Spanish' },
    { name: 'Brazil (Portuguese)', value: 'Brazilian Portuguese' },
    { name: 'Argentina (Spanish)', value: 'Argentine Spanish' },
    { name: 'France (French)', value: 'French' },
    { name: 'Germany (German)', value: 'German' },
    { name: 'Italy (Italian)', value: 'Italian' },
    { name: 'Spain (Spanish)', value: 'European Spanish' },
    { name: 'Russia (Russian)', value: 'Russian' },
    { name: 'South Africa (English)', value: 'South African English' },
    { name: 'Egypt (Arabic)', value: 'Arabic' },
];

const CoverSongGenerator: React.FC = () => {
    const [mode, setMode] = useState<'upload' | 'create'>('upload');
    const [file, setFile] = useState<{ base64: string, mimeType: string } | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [songTitle, setSongTitle] = useState('');
    const [gender, setGender] = useState<'Male' | 'Female'>('Male');
    const [lyrics, setLyrics] = useState('');
    const [translatedLyrics, setTranslatedLyrics] = useState('');
    const [isProcessing, setIsProcessing] = useState(false); // Shared loading state for extracting/generating
    const [isTranslating, setIsTranslating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [targetLang, setTargetLang] = useState('English');
    const [activeTab, setActiveTab] = useState<'original' | 'translated'>('original');
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    useEffect(() => {
        return () => { if (fileUrl) URL.revokeObjectURL(fileUrl); };
    }, [fileUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            if (fileUrl) URL.revokeObjectURL(fileUrl);
            const url = URL.createObjectURL(selectedFile);
            setFileUrl(url);
            
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setFile({
                    base64: base64String.split(',')[1],
                    mimeType: selectedFile.type
                });
                setLyrics('');
                setTranslatedLyrics('');
                setError(null);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    const handleGetLyrics = async () => {
        if (mode === 'upload') {
            if (!file) return;
            setIsProcessing(true);
            setError(null);
            setActiveTab('original');
            try {
                const result = await extractLyricsFromMedia(file.base64, file.mimeType);
                setLyrics(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to extract lyrics.');
            } finally {
                setIsProcessing(false);
            }
        } else {
            // Create New Song Mode
            if (!songTitle.trim()) {
                setError('Please enter a song title.');
                return;
            }
            setIsProcessing(true);
            setError(null);
            setActiveTab('original');
            try {
                const result = await generateLyricsFromTitle(songTitle, gender);
                setLyrics(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to generate lyrics.');
            } finally {
                setIsProcessing(false);
            }
        }
    };

    const handleTranslate = async () => {
        if (!lyrics) return;
        setIsTranslating(true);
        setError(null);
        setActiveTab('translated');
        try {
            // Use specialized song translation for cover songs
            const result = await translateSongLyrics(lyrics, 'Original Song Language', targetLang);
            setTranslatedLyrics(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Translation failed.');
        } finally {
            setIsTranslating(false);
        }
    };

    const handleCopy = () => {
        const text = activeTab === 'original' ? lyrics : translatedLyrics;
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const text = activeTab === 'original' ? lyrics : translatedLyrics;
        if (!text) return;
        const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `lyrics-${activeTab}-${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleClear = () => {
        setFile(null);
        if (fileUrl) URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
        setSongTitle('');
        setLyrics('');
        setTranslatedLyrics('');
        setError(null);
        setActiveTab('original');
        setIsEditing(false);
        setGender('Male');
    };

    return (
        <div className="w-full max-w-6xl mx-auto p-4">
            <ClearProjectButton onClick={handleClear} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 h-fit">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-500 mb-4 text-center">
                        បង្កើត Cover Song 🎶
                    </h2>

                    {/* Mode Switcher */}
                    <div className="flex bg-gray-900 p-1 rounded-lg border border-gray-700 mb-6">
                        <button 
                            onClick={() => setMode('upload')} 
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'upload' ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            Upload Video/MP3
                        </button>
                        <button 
                            onClick={() => setMode('create')} 
                            className={`flex-1 py-2 text-sm font-bold rounded-md transition ${mode === 'create' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'}`}
                        >
                            បង្កើត New Song
                        </button>
                    </div>
                    
                    {mode === 'upload' ? (
                        <div className="aspect-video bg-gray-900 rounded-lg border border-gray-700 overflow-hidden mb-6 flex items-center justify-center relative">
                            {fileUrl ? (
                                file?.mimeType.startsWith('video') ? (
                                    <video src={fileUrl} controls className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                        <div className="animate-pulse mb-4 text-6xl">🎵</div>
                                        <audio src={fileUrl} controls className="w-full" />
                                    </div>
                                )
                            ) : (
                                <label htmlFor="media-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-gray-800 transition-colors p-4 text-center">
                                    <UploadIcon />
                                    <span className="text-gray-400 font-medium mt-2">Upload Song (Video/MP3)</span>
                                    <span className="text-xs text-gray-500 mt-1">MP3, WAV, MP4, MOV</span>
                                    <input id="media-upload" type="file" accept="video/*,audio/*" onChange={handleFileChange} className="hidden" />
                                </label>
                            )}
                        </div>
                    ) : (
                        <div className="mb-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-300">Paste Song Title</label>
                                <input 
                                    type="text" 
                                    value={songTitle} 
                                    onChange={(e) => setSongTitle(e.target.value)} 
                                    placeholder="e.g., ស្នេហាវ័យក្មេង, Shape of You..." 
                                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg p-3 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <p className="text-xs text-gray-500 mt-2">Supports titles in any language (Khmer, English, etc.)</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-2 text-gray-300">Gender</label>
                                <div className="flex gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
                                    <button 
                                        onClick={() => setGender('Male')} 
                                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${gender === 'Male' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        👨 Male
                                    </button>
                                    <button 
                                        onClick={() => setGender('Female')} 
                                        className={`flex-1 py-2 text-sm font-semibold rounded-md transition ${gender === 'Female' ? 'bg-pink-500 text-white' : 'text-gray-400 hover:text-white'}`}
                                    >
                                        👩 Female
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={handleGetLyrics} 
                        disabled={(mode === 'upload' && !file) || (mode === 'create' && !songTitle.trim()) || isProcessing}
                        className="w-full py-3 px-6 font-bold text-white bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg shadow-lg hover:from-pink-500 hover:to-purple-500 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {isProcessing ? <Spinner /> : '🎶'} 
                        {isProcessing ? 'Generating Lyrics...' : 'Get Lyric Song 🎶'}
                    </button>
                    
                    {error && <div className="mt-4 p-3 bg-red-900/50 border border-red-700 text-red-200 rounded text-sm text-center">{error}</div>}
                </div>

                {/* Lyrics Output */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 flex flex-col h-[600px]">
                    <div className="flex flex-wrap justify-between items-center mb-4 gap-2">
                        <div className="flex gap-2 bg-gray-900 p-1 rounded-lg border border-gray-700">
                            <button
                                onClick={() => setActiveTab('original')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'original' ? 'bg-pink-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Original
                            </button>
                            <button
                                onClick={() => setActiveTab('translated')}
                                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition ${activeTab === 'translated' ? 'bg-purple-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                Translated (Cover Version)
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                            <button onClick={() => setIsEditing(!isEditing)} className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition" title="Edit Lyrics">
                                ✏️
                            </button>
                            <button onClick={handleCopy} disabled={!lyrics} className="p-2 text-gray-400 hover:text-white bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-50" title="Copy">
                                {copied ? <span className="text-green-400 text-xs font-bold">✓</span> : <CopyIcon />}
                            </button>
                            <button onClick={handleDownload} disabled={!lyrics} className="px-3 py-1.5 text-xs font-bold text-white bg-gray-700 hover:bg-gray-600 rounded transition disabled:opacity-50">
                                Download
                            </button>
                        </div>
                    </div>

                    <div className="mb-3 flex items-center gap-2 bg-gray-700/30 p-2 rounded-lg border border-gray-600/50">
                        <span className="text-xs text-gray-400 whitespace-nowrap">Change Version To:</span>
                        <select 
                            value={targetLang} 
                            onChange={(e) => setTargetLang(e.target.value)}
                            className="bg-gray-900 text-white text-xs p-1.5 rounded border border-gray-600 outline-none focus:border-pink-500 flex-grow"
                        >
                            {languages.map(lang => (
                                <option key={lang.value} value={lang.value}>{lang.name}</option>
                            ))}
                        </select>
                        <button 
                            onClick={handleTranslate} 
                            disabled={isTranslating || !lyrics}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition shadow-sm disabled:opacity-50"
                        >
                            {isTranslating ? <Spinner className="h-3 w-3"/> : 'Translate'}
                        </button>
                    </div>
                    
                    <div className="flex-grow bg-gray-900 rounded-lg p-1 overflow-hidden border border-gray-700 relative">
                        {isProcessing || isTranslating ? (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <Spinner className="h-8 w-8 text-pink-500 mb-2" />
                                <p>{isProcessing ? 'Writing Lyrics...' : 'Translating & Matching Rhythm...'}</p>
                            </div>
                        ) : (
                            <textarea
                                value={activeTab === 'original' ? lyrics : translatedLyrics}
                                onChange={(e) => {
                                    if (activeTab === 'original') setLyrics(e.target.value);
                                    else setTranslatedLyrics(e.target.value);
                                }}
                                readOnly={!isEditing}
                                className={`w-full h-full bg-transparent text-gray-300 p-4 resize-none outline-none font-mono text-sm leading-relaxed ${isEditing ? 'cursor-text' : 'cursor-default'}`}
                                placeholder={activeTab === 'original' ? "🎵 Song Title\n\n[Verse 1]\n..." : "Translated cover version will appear here..."}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CoverSongGenerator;