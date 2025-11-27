import React, { useState, useCallback, useEffect } from 'react';
// FIX: Renamed 'generateTextToVoiceover' to 'generateVoiceover' to match the exported function name from geminiService.
import { generatePodcastScript, generateVoiceover, generateDialog, generateImage } from '../services/geminiService.ts';
import type { PrebuiltVoice, PodcastCharacter, Dialog } from '../services/geminiService.ts';

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

// --- Character ---
interface Character {
    id: number;
    name: string;
    voice: PrebuiltVoice;
}

const allVoices: PrebuiltVoice[] = ['Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'];

const speakingStyles = [
    { key: 'reading', emoji: '🎙️', km: '១. បែបអានសៀវភៅ', en: 'Reading / Calm Narration' },
    { key: 'storytelling', emoji: '🎞️', km: '២. បែបនិយាយរឿង', en: 'Storytelling / Documentary Style' },
    { key: 'explainer', emoji: '🧑‍🏫', km: '៣. បែបពន្យល់', en: 'Educational / Explainer Style' },
    { key: 'teacher', emoji: '🎓', km: '៤. បែបបង្រៀន', en: 'Teacher / Mentor Style' },
    { key: 'creative', emoji: '🔥', km: '៥. បែបច្នៃប្រឌិត', en: 'Creative Motivational Style' },
    { key: 'news', emoji: '💼', km: '៦. បែបប្រកាសព័ត៌មាន', en: 'News / Formal Style' },
    { key: 'conversational', emoji: '🗣️', km: '៧. បែបសំណេះសំណាល', en: 'Friendly Conversational Style' },
    { key: 'investigation', emoji: '🕵️', km: '៨. បែបស៊ើបអង្កេត', en: 'Fact Style (Investigation Tone)' },
    { key: 'product_review', emoji: '🎬', km: '៩. បែបបង្ហាញផលិតផល', en: 'Product Review / Tutorial Voice' },
    { key: 'short_form', emoji: '⚡', km: '១០. បែបប្រើសម្រាប់ Short Form', en: 'Quick Explain / Hook Style' },
];


// --- Helper Components ---
const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin text-white ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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


const PodcastGenerator: React.FC = () => {
    const [podcastType, setPodcastType] = useState<'solo' | 'team'>('solo');
    const [language, setLanguage] = useState<'km' | 'en'>('km');
    const [topic, setTopic] = useState('');
    const [characters, setCharacters] = useState<Character[]>([{ id: Date.now(), name: '', voice: 'Kore' }]);
    const [durationInMinutes, setDurationInMinutes] = useState<number>(2);
    const [speakingStyle, setSpeakingStyle] = useState<string>(speakingStyles[6].en);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [audioUrl, setAudioUrl] = useState<string | null>(null);
    const [script, setScript] = useState<string | Dialog[] | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedScriptText, setEditedScriptText] = useState('');
    const [coverImage, setCoverImage] = useState<{ loading: boolean; url: string | null; error: string | null }>({ loading: false, url: null, error: null });
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [autoSetup, setAutoSetup] = useState(false);
    const [introductionScript, setIntroductionScript] = useState('');
    const [speakAboutTopic, setSpeakAboutTopic] = useState('');


    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);

    useEffect(() => {
        if (podcastType === 'team' && autoSetup) {
            const interviewerName = language === 'km' ? 'អ្នកសម្ភាសន៍' : 'Interviewer';
    
            if (characters[0]?.name !== interviewerName) {
                setCharacters(prev => {
                    const newChars = [...prev];
                    if (newChars[0]) {
                        newChars[0] = { ...newChars[0], name: interviewerName, voice: 'Kore' };
                    }
                    if (newChars[1]) {
                        newChars[1] = { ...newChars[1], voice: 'Puck' };
                    }
                    return newChars;
                });
            }
    
            const intervieweeName = characters[1]?.name.trim() || (language === 'km' ? '[ឈ្មោះអ្នកផ្តល់បទសម្ភាសន៍]' : '[Interviewee Name]');
    
            const getTemplateParts = (lang: 'km' | 'en', iName: string, i2Name: string) => {
                if (lang === 'km') {
                    const intro = `${iName}: សូមស្វាគមន៍មកកាន់ផតខាសរបស់យើង! យើងពិតជារីករាយណាស់ដែលអ្នកបានចូលរួមជាមួយយើងនៅថ្ងៃនេះ។\n\n${iName}: ដើម្បីចាប់ផ្តើម តើអ្នកអាចណែនាំខ្លួនអ្នកទៅកាន់អ្នកស្តាប់របស់យើងបានទេ?`;
                    const body = `${i2Name}: ពិតណាស់។ ខ្ញុំឈ្មោះ ${i2Name} ហើយខ្ញុំរីករាយណាស់ដែលបានមកទីនេះ។\n\n${iName}: សូមអរគុណ។ សូមរៀបរាប់បន្តិចអំពីខ្លួនអ្នក៖ អាយុ, ការងារ, គ្រួសារ, និងអាសយដ្ឋាន។\n\n${i2Name}: [សូមបំពេញចម្លើយនៅទីនេះ]\n\n${iName}: មុនពេលចាប់ផ្តើមការងារនេះ តើអ្នកបានធ្វើអ្វីខ្លះពីមុនមក?\n\n${i2Name}: [សូមបំពេញចម្លើយនៅទីនេះ]`;
                    return { intro, body };
                }
                const intro = `${iName}: Welcome to our podcast! We're thrilled to have you here today.\n\n${iName}: To start, could you please introduce yourself to our listeners?`;
                const body = `${i2Name}: Of course. My name is ${i2Name}, and it's a pleasure to be here.\n\n${iName}: Thank you. Please tell us a bit about yourself: your age, work, family, and home address.\n\n${i2Name}: [Please provide your answer here]\n\n${iName}: What did you do before this?\n\n${i2Name}: [Please provide your answer here]`;
                return { intro, body };
            };
    
            const { intro, body } = getTemplateParts(language, interviewerName, intervieweeName);
            setIntroductionScript(intro);
            setTopic(body);
    
        } else {
            setIntroductionScript('');
            // Clear topic only if user unchecks the box, but not on initial load
            if (!autoSetup && topic.includes('[សូមបំពេញចម្លើយនៅទីនេះ]')) {
                setTopic('');
            }
        }
    }, [autoSetup, podcastType, language, characters[1]?.name]);


    const handlePodcastTypeChange = (type: 'solo' | 'team') => {
        setPodcastType(type);
        setAutoSetup(false);
        if (type === 'solo') {
            setCharacters([{ id: Date.now(), name: characters[0]?.name || '', voice: characters[0]?.voice || 'Kore' }]);
        } else {
            setCharacters([
                { id: Date.now(), name: characters[0]?.name || '', voice: 'Kore' },
                { id: Date.now() + 1, name: '', voice: 'Puck' }
            ]);
        }
    };

    const updateCharacter = (id: number, field: keyof Omit<Character, 'id'>, value: string) => {
        setCharacters(chars => chars.map(c => c.id === id ? { ...c, [field]: value } : c));
    };

    const handleClear = () => {
        setTopic('');
        setSpeakAboutTopic('');
        setCharacters([{ id: Date.now(), name: '', voice: 'Kore' }]);
        setPodcastType('solo');
        setLanguage('km');
        setDurationInMinutes(2);
        setSpeakingStyle(speakingStyles[6].en);
        setError(null);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setScript(null);
        setIsEditing(false);
        setEditedScriptText('');
        setCoverImage({ loading: false, url: null, error: null });
        setAutoSetup(false);
    };

    const formatScriptForEditing = (scriptData: string | Dialog[]): string => {
        if (typeof scriptData === 'string') {
            return scriptData;
        }
        return scriptData.map(d => `${d.character}: ${d.line}`).join('\n\n');
    };

    const parseEditedScript = (text: string): Dialog[] => {
        const dialogs: Dialog[] = [];
        const entries = text.split('\n\n'); // Split by double newline to handle multi-line dialogs
        for (const entry of entries) {
            const parts = entry.split(/:\s*(.*)/s); // Split on the first colon
            if (parts.length >= 2) {
                const character = parts[0].trim();
                const line = parts[1].trim();
                if (character && line) {
                    dialogs.push({ character, line });
                }
            }
        }
        return dialogs;
    };


    const handleStart = useCallback(async () => {
        setError(null);
        if (!topic.trim() && !(autoSetup && speakAboutTopic.trim())) {
            setError('Please provide a topic for the podcast.');
            return;
        }
        const validCharacters = characters.filter(c => c.name.trim());
        if (validCharacters.length !== characters.length) {
            setError('All characters must have a name.');
            return;
        }
        if (podcastType === 'team' && characters.length !== 2) {
            setError('Team podcast requires exactly 2 characters.');
            return;
        }

        setIsLoading(true);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
        setScript(null);
        setCoverImage({ loading: false, url: null, error: null });
        setIsEditing(false);

        try {
            let scriptToUse: string | Dialog[];
            
            if (podcastType === 'team' && autoSetup && speakAboutTopic.trim()) {
                const fullTemplateForAI = `${introductionScript}\n\n${topic}`;
                scriptToUse = await generatePodcastScript({
                    topic: speakAboutTopic,
                    interviewTemplate: fullTemplateForAI,
                    language, podcastType, characters: characters.map(c => ({ name: c.name })), durationInMinutes, speakingStyle,
                });
            } else if (podcastType === 'team' && autoSetup) {
                const fullScriptText = `${introductionScript}\n\n${topic}`;
                scriptToUse = parseEditedScript(fullScriptText);
            } else {
                 scriptToUse = await generatePodcastScript({
                    topic, language, podcastType, characters: characters.map(c => ({ name: c.name })), durationInMinutes, speakingStyle,
                });
            }

            setScript(scriptToUse);
            setEditedScriptText(formatScriptForEditing(scriptToUse));

            let base64Audio: string;
            if (podcastType === 'solo') {
                // FIX: Renamed 'generateTextToVoiceover' to 'generateVoiceover' to match the exported function name from geminiService.
                base64Audio = await generateVoiceover(scriptToUse as string, language, characters[0].voice);
            } else {
                const speakerConfigs = characters.map(c => ({ speaker: c.name, voiceName: c.voice }));
                const validDialog = (scriptToUse as Dialog[]).filter(d =>
                    characters.some(c => c.name.trim().toLowerCase() === d.character.trim().toLowerCase())
                );
                base64Audio = await generateDialog(validDialog, speakerConfigs);
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
    }, [topic, language, podcastType, characters, audioUrl, durationInMinutes, speakingStyle, autoSetup, introductionScript, speakAboutTopic]);

    const handleRegenerateAudio = async () => {
        setError(null);
        setIsRegenerating(true);
        if (audioUrl) URL.revokeObjectURL(audioUrl);
        setAudioUrl(null);
    
        try {
            let base64Audio: string;
            if (podcastType === 'solo') {
                setScript(editedScriptText);
                // FIX: Renamed 'generateTextToVoiceover' to 'generateVoiceover' to match the exported function name from geminiService.
                base64Audio = await generateVoiceover(editedScriptText, language, characters[0].voice);
            } else {
                const parsedDialog = parseEditedScript(editedScriptText);
                if (parsedDialog.length === 0) {
                    throw new Error("Could not parse the edited script. Ensure it follows the 'Character: Line' format.");
                }
                setScript(parsedDialog);
                const speakerConfigs = characters.map(c => ({ speaker: c.name, voiceName: c.voice }));
                const validDialog = parsedDialog.filter(d => characters.some(c => c.name.trim().toLowerCase() === d.character.trim().toLowerCase()));
                if (validDialog.length === 0) {
                    throw new Error("No lines in the edited script match the defined character names.");
                }
                base64Audio = await generateDialog(validDialog, speakerConfigs);
            }
    
            const pcmBytes = decode(base64Audio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16);
            const url = URL.createObjectURL(wavBlob);
            setAudioUrl(url);
            setIsEditing(false);
        } catch(err) {
            setError(err instanceof Error ? err.message : 'Failed to regenerate audio.');
        } finally {
            setIsRegenerating(false);
        }
    };
    
    const handleGenerateCoverImage = async () => {
        setCoverImage({ loading: true, url: null, error: null });
        try {
            const imagePrompt = `Podcast cover art for a show about "${topic}". Style: ${speakingStyle}, simple, graphic design, vibrant colors.`;
            const imageUrl = await generateImage(imagePrompt, '1:1');
            setCoverImage({ loading: false, url: imageUrl, error: null });
        } catch(err) {
            setCoverImage({ loading: false, url: null, error: err instanceof Error ? err.message : 'Image generation failed.' });
        }
    };
    

    const inputClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400 disabled:opacity-50";
    const isReady = (topic.trim() || (autoSetup && speakAboutTopic.trim())) && characters.every(c => c.name.trim()) && (podcastType === 'solo' ? characters.length === 1 : characters.length === 2);

    return (
        <div className="w-full max-w-7xl mx-auto flex flex-col">
            <ClearProjectButton onClick={handleClear} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Controls Panel */}
                <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                    <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Podcast Generator</h2>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-300">Podcast Type</label>
                            <div className="flex items-center gap-1 bg-gray-700 p-1 rounded-lg">
                                <button onClick={() => handlePodcastTypeChange('solo')} disabled={isLoading} className={`w-full py-2 text-sm font-semibold rounded-md transition ${podcastType === 'solo' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Solo</button>
                                <button onClick={() => handlePodcastTypeChange('team')} disabled={isLoading} className={`w-full py-2 text-sm font-semibold rounded-md transition ${podcastType === 'team' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Team</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-2 text-gray-300">Podcast Language</label>
                            <div className="flex items-center gap-1 bg-gray-700 p-1 rounded-lg">
                                <button onClick={() => setLanguage('km')} disabled={isLoading} className={`w-full py-2 text-sm font-semibold rounded-md transition ${language === 'km' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>Cambodia</button>
                                <button onClick={() => setLanguage('en')} disabled={isLoading} className={`w-full py-2 text-sm font-semibold rounded-md transition ${language === 'en' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>English</button>
                            </div>
                        </div>
                    </div>

                    {podcastType === 'team' && (
                        <div className="relative flex items-start">
                            <div className="flex h-6 items-center">
                                <input
                                    id="autoSetupPodcast"
                                    type="checkbox"
                                    checked={autoSetup}
                                    onChange={(e) => setAutoSetup(e.target.checked)}
                                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-purple-600 focus:ring-purple-600"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="autoSetupPodcast" className="font-medium text-gray-300">
                                    Auto Interview Setup
                                </label>
                                <p className="text-gray-400">Sets up an interviewer and provides a script template in the topic field.</p>
                            </div>
                        </div>
                    )}

                    {podcastType === 'team' && autoSetup && (
                        <div>
                            <label htmlFor="speakAboutTopic" className="block text-sm font-semibold mb-2 text-gray-300">
                                {language === 'km' ? 'ប្រធានបទសម្ភាសន៍' : 'Interview Topic'}
                            </label>
                            <textarea
                                id="speakAboutTopic"
                                value={speakAboutTopic}
                                onChange={(e) => setSpeakAboutTopic(e.target.value)}
                                placeholder={language === 'km' ? 'ឧ: និយាយអំពីបទពិសោធន៍របស់គាត់ជាសហគ្រិន...' : 'e.g., Talk about their experience as an entrepreneur...'}
                                className={`${inputClasses} h-20 resize-y`}
                                disabled={isLoading}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                {language === 'km' ? 'AI នឹងបង្កើតសំណួរ និងចម្លើយដោយផ្អែកលើប្រធានបទនេះ។' : 'The AI will generate questions and answers based on this topic.'}
                            </p>
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Set Time (Minutes)</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar p-1 border border-gray-700 rounded-lg bg-gray-800">
                            {Array.from({ length: 30 }, (_, i) => i + 1).map(min => (
                                <button
                                    key={min}
                                    onClick={() => setDurationInMinutes(min)}
                                    disabled={isLoading}
                                    className={`w-10 h-10 flex items-center justify-center text-sm font-semibold rounded-md transition-all duration-200 disabled:opacity-50 ${durationInMinutes === min ? 'bg-purple-500 text-white shadow-lg ring-2 ring-purple-400 scale-105' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                    {min}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Speaking Style</label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {speakingStyles.map(style => (
                                <button
                                    key={style.key}
                                    onClick={() => setSpeakingStyle(style.en)}
                                    disabled={isLoading}
                                    className={`p-3 text-left text-sm font-semibold rounded-md transition w-full disabled:opacity-50 flex items-center ${speakingStyle === style.en ? 'bg-purple-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                                >
                                    <span className="text-xl mr-3">{style.emoji}</span>
                                    <span>{style.km}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="topic" className="block text-sm font-semibold mb-2 text-gray-300">Paste Topic</label>
                        <textarea id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What is your podcast about?" className={`${inputClasses} h-24 resize-y`} disabled={isLoading} />
                    </div>

                    {podcastType === 'team' && autoSetup && introductionScript && (
                        <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg space-y-2">
                            <h4 className="text-sm font-semibold text-cyan-400">Generated Introduction</h4>
                            <p className="text-gray-300 text-sm whitespace-pre-wrap font-mono">{introductionScript}</p>
                        </div>
                    )}

                    <div>
                        <h3 className="text-base font-semibold mb-2 text-gray-300">Character Details</h3>
                        <div className="space-y-4">
                            {characters.map((char, index) => (
                                <div key={char.id} className="p-4 rounded-lg bg-gray-900/50 border border-gray-700">
                                    <h4 className="font-semibold text-cyan-400 mb-3">{podcastType === 'solo' ? 'Host' : (autoSetup ? (index === 0 ? 'Interviewer' : 'Interviewee') : `Speaker ${index + 1}`)}</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <input type="text" placeholder="Name" value={char.name} onChange={e => updateCharacter(char.id, 'name', e.target.value)} className={inputClasses} disabled={isLoading || (podcastType === 'team' && autoSetup && index === 0)} />
                                        <select value={char.voice} onChange={e => updateCharacter(char.id, 'voice', e.target.value)} className={inputClasses} disabled={isLoading}>
                                            {allVoices.map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <button onClick={handleStart} disabled={isLoading || !isReady} className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? <><Spinner /> Generating...</> : 'Start'}
                    </button>
                </div>
                
                {/* Output Panel */}
                <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-fit min-h-[500px]">
                    <h2 className="text-lg font-semibold text-gray-300 mb-4">Generated Podcast</h2>
                    <div className="flex-grow bg-gray-900 rounded-md flex flex-col items-center justify-center relative overflow-hidden p-4">
                        {isLoading ? (
                            <div className="text-center">
                                <Spinner className="h-10 w-10 text-cyan-400 mx-auto" />
                                <p className="text-white mt-2 text-sm">Generating your podcast...</p>
                            </div>
                        ) : error ? (
                             <div className="p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                                {error}
                            </div>
                        ) : isEditing ? (
                            <div className="w-full h-full flex flex-col space-y-4">
                                <textarea
                                    value={editedScriptText}
                                    onChange={(e) => setEditedScriptText(e.target.value)}
                                    className="flex-grow w-full bg-gray-800 border border-gray-600 text-gray-200 rounded-lg p-3 resize-y"
                                />
                                <div className="flex gap-4">
                                    <button onClick={handleRegenerateAudio} disabled={isRegenerating} className="flex-1 flex items-center justify-center px-4 py-2 font-semibold text-white bg-emerald-600 rounded-lg shadow-md hover:bg-emerald-500 disabled:opacity-50">
                                        {isRegenerating ? <><Spinner/>Regenerating...</> : 'Save & Regenerate Audio'}
                                    </button>
                                    <button onClick={() => setIsEditing(false)} className="flex-1 flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-500">
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        ) : audioUrl ? (
                            <div className="w-full space-y-4">
                                <audio controls src={audioUrl} className="w-full">Your browser does not support the audio element.</audio>
                                <div className="flex flex-wrap gap-2">
                                     <a href={audioUrl} download={`podcast-${Date.now()}.wav`} className="flex-1 flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-500">💾 Download</a>
                                     <button onClick={() => setIsEditing(true)} className="flex-1 flex items-center justify-center px-4 py-2 font-semibold text-white bg-gray-600 rounded-lg shadow-md hover:bg-gray-500">✏️ Edit Voice</button>
                                </div>
                                <button onClick={handleGenerateCoverImage} disabled={coverImage.loading} className="w-full flex items-center justify-center px-4 py-2 font-semibold text-white bg-teal-600 rounded-lg shadow-md hover:bg-teal-500 disabled:opacity-50">
                                   {coverImage.loading ? <><Spinner/>Generating...</> : '🖼️ Generate Cover Image'}
                                </button>
                                {coverImage.loading && <div className="flex justify-center p-4"><Spinner className="h-8 w-8 text-cyan-400"/></div>}
                                {coverImage.error && <p className="text-red-400 text-center text-sm p-2">{coverImage.error}</p>}
                                {coverImage.url && <img src={coverImage.url} alt="Generated podcast cover" className="rounded-lg mt-4 w-full aspect-square object-cover" />}
                            </div>
                        ) : (
                            <div className="text-center text-gray-500">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                                <p>Your generated podcast audio will appear here</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PodcastGenerator;