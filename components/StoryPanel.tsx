import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { StoryScene, generateNarration, generateDialog } from '../services/geminiService.ts';

// --- Icons ---
const StoryIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
);

const Spinner: React.FC = () => (
  <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const CopyIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7v8a2 2 0 002 2h8M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2" />
    </svg>
);

const PlayIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
    </svg>
);

const AudioLoadingIcon: React.FC = () => (
    <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

// --- Audio Utilities (as per guidelines) ---
const decode = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};

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

// --- SceneItem Component ---
interface SceneItemProps {
  scene: StoryScene;
}

const SceneItem: React.FC<SceneItemProps> = ({ scene }) => {
    const [isNarrationLoading, setIsNarrationLoading] = useState(false);
    const [isDialogLoading, setIsDialogLoading] = useState(false);
    const [narrationAudio, setNarrationAudio] = useState<string | null>(null);
    const [dialogAudio, setDialogAudio] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [promptCopied, setPromptCopied] = useState(false);
    const [sceneJsonCopied, setSceneJsonCopied] = useState(false);

    // Memoize to prevent re-calculating on every render
    const uniqueSpeakers = useMemo(() => [...new Set(scene.dialog.map(d => d.character))], [scene.dialog]);
    const canGenerateDialog = uniqueSpeakers.length === 2;
    
    // Create a single AudioContext for this component instance
    const audioContext = useMemo(() => new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }), []);

    const playAudio = useCallback(async (base64String: string) => {
        try {
            const decodedBytes = decode(base64String);
            const audioBuffer = await decodeAudioData(decodedBytes, audioContext, 24000, 1);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.start();
        } catch (e) {
            console.error("Failed to play audio:", e);
            setError("Could not play audio. Data might be corrupted.");
        }
    }, [audioContext]);

    const handleGenerateNarration = async () => {
        setIsNarrationLoading(true);
        setError(null);
        try {
            const audioB64 = await generateNarration(scene.scene_description.line);
            setNarrationAudio(audioB64);
            playAudio(audioB64);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Narration failed');
        } finally {
            setIsNarrationLoading(false);
        }
    };
    
    const handleGenerateDialog = async () => {
        if (!canGenerateDialog) return;
        setIsDialogLoading(true);
        setError(null);
        try {
            // Assign fixed voices for consistency
            const speakerConfigs = [
                { speaker: uniqueSpeakers[0], voiceName: 'Puck' as const },
                { speaker: uniqueSpeakers[1], voiceName: 'Fenrir' as const }
            ];
            const audioB64 = await generateDialog(scene.dialog, speakerConfigs);
            setDialogAudio(audioB64);
            playAudio(audioB64);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Dialog failed');
        } finally {
            setIsDialogLoading(false);
        }
    };

    const handleCopyPrompt = () => {
        navigator.clipboard.writeText(scene.prompt);
        setPromptCopied(true);
        setTimeout(() => setPromptCopied(false), 2000);
    };

    const handleCopySceneJson = () => {
        navigator.clipboard.writeText(JSON.stringify(scene, null, 2));
        setSceneJsonCopied(true);
        setTimeout(() => setSceneJsonCopied(false), 2000);
    };
    
    const handleDownloadNarration = useCallback(() => {
        if (!narrationAudio) return;
        try {
            const pcmBytes = decode(narrationAudio);
            const pcmInt16 = new Int16Array(pcmBytes.buffer);
            const wavBlob = pcmToWavBlob(pcmInt16, 1, 24000, 16); // Gemini TTS is 24kHz mono
            const url = URL.createObjectURL(wavBlob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `scene-${scene.scene_number}-narration.wav`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Failed to create download link:", e);
            setError("Could not create download file.");
        }
    }, [narrationAudio, scene.scene_number]);
    
    const renderButton = (
        type: 'narration' | 'dialog',
        isLoading: boolean,
        audioData: string | null,
        generateHandler: () => void,
        playHandler: (audio: string) => void,
        disabled: boolean = false
    ) => (
        <button
            onClick={() => audioData ? playHandler(audioData) : generateHandler()}
            disabled={isLoading || disabled}
            className="flex items-center justify-center px-3 py-1.5 text-xs font-semibold text-white bg-gray-700 rounded-md shadow-sm hover:bg-gray-600 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        >
            {isLoading ? <><AudioLoadingIcon /> Generating...</>
             : audioData ? <><PlayIcon /> Play {type}</>
             : `Generate ${type}`
            }
        </button>
    );

    return (
        <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-700">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="font-bold text-lg text-cyan-400">Scene {scene.scene_number}: {scene.title}</h3>
                    <p className="text-sm text-gray-400 font-mono">{scene.slug}</p>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={handleCopyPrompt} title="Copy Image Prompt" className="p-2 text-gray-400 bg-gray-700 rounded-md hover:bg-gray-600 hover:text-white transition">
                        {promptCopied ? <span className="text-xs text-cyan-300">Copied!</span> : <CopyIcon />}
                    </button>
                </div>
            </div>

            <div className="space-y-3 text-sm">
                <p><strong className="text-gray-400">📝 Prompt:</strong> {scene.prompt}</p>
                <p><strong className="text-gray-400">🎤 Narration:</strong> {scene.scene_description.line}</p>
                {scene.dialog.map((d, i) => (
                    <p key={i}><strong className="text-purple-400">{d.character}:</strong> {d.line}</p>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-600/50 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    {renderButton('narration', isNarrationLoading, narrationAudio, handleGenerateNarration, playAudio)}
                    {narrationAudio && (
                        <button onClick={handleDownloadNarration} title="Download Narration" className="p-2 text-white bg-gray-700 rounded-md shadow-sm hover:bg-gray-600 transition"><DownloadIcon /></button>
                    )}
                    {renderButton('dialog', isDialogLoading, dialogAudio, handleGenerateDialog, playAudio, !canGenerateDialog)}
                </div>
                <button onClick={handleCopySceneJson} className="flex items-center px-3 py-1.5 text-xs font-semibold text-white bg-gray-700 rounded-md shadow-sm hover:bg-gray-600 transition">
                    {sceneJsonCopied ? <span className="text-cyan-300">Copied!</span> : <><CopyIcon className="mr-1.5 h-4 w-4"/> Copy Scene JSON</>}
                </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-400 text-center">{error}</p>}
        </div>
    );
};


// --- StoryPanel Component ---
interface StoryPanelProps {
  story: StoryScene[] | null;
  isLoading: boolean;
}

const StoryPanel: React.FC<StoryPanelProps> = ({ story, isLoading }) => {
    const [viewMode, setViewMode] = useState<'scenes' | 'json'>('scenes');
    const [copyStatus, setCopyStatus] = useState<'idle' | 'copiedJson' | 'copiedMin'>('idle');

    const handleCopy = (minified: boolean) => {
        if (!story) return;
        const jsonString = JSON.stringify(story, null, minified ? undefined : 2);
        navigator.clipboard.writeText(jsonString);
        setCopyStatus(minified ? 'copiedMin' : 'copiedJson');
        setTimeout(() => setCopyStatus('idle'), 2000);
    };

    const handleDownloadAll = () => {
        if (!story) return;

        // Convert story scenes to a human-readable text format
        const scriptText = story.map(scene => {
            let sceneContent = `SCENE ${scene.scene_number}: ${scene.title.toUpperCase()}\n`;
            sceneContent += `SLUG: ${scene.slug}\n\n`;

            if (scene.scene_description.line) {
                sceneContent += `(NARRATOR)\n${scene.scene_description.line}\n\n`;
            }

            if (scene.dialog && scene.dialog.length > 0) {
                sceneContent += scene.dialog.map(d => `${d.character.toUpperCase()}\n${d.line}`).join('\n\n') + '\n\n';
            }

            return sceneContent;
        }).join('----------------------------------------\n\n');

        const blob = new Blob([scriptText], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `story-script-${Date.now()}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };


    return (
        <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-[70vh] min-h-[500px]">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="text-lg font-semibold text-gray-300">Generated Story</h2>
                {story && (
                     <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 bg-gray-900 p-1 rounded-lg border border-gray-700">
                            <button onClick={() => setViewMode('scenes')} className={`px-3 py-1 text-xs font-semibold rounded-md transition ${viewMode === 'scenes' ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}>Scenes</button>
                            <button onClick={() => setViewMode('json')} className={`px-3 py-1 text-xs font-semibold rounded-md transition ${viewMode === 'json' ? 'bg-cyan-600 text-white' : 'text-gray-300'}`}>JSON Code</button>
                        </div>
                        <div className="h-6 w-px bg-gray-600"></div>
                         <button onClick={handleDownloadAll} className="flex items-center px-3 py-1.5 text-sm font-semibold text-white bg-emerald-600 rounded-md shadow-sm hover:bg-emerald-500 transition-all duration-200">
                             <DownloadIcon className="mr-1.5 h-4 w-4" />
                             All Scenes
                         </button>
                         <button onClick={() => handleCopy(false)} className="flex items-center px-3 py-1.5 text-sm font-semibold text-white bg-gray-600 rounded-md shadow-sm hover:bg-gray-500 transition-all duration-200">
                            {copyStatus === 'copiedJson' ? <span className="text-cyan-400">Copied!</span> : 'Copy Full JSON'}
                        </button>
                         <button onClick={() => handleCopy(true)} className="flex items-center px-3 py-1.5 text-sm font-semibold text-white bg-gray-600 rounded-md shadow-sm hover:bg-gray-500 transition-all duration-200">
                            {copyStatus === 'copiedMin' ? <span className="text-cyan-400">Copied!</span> : 'Copy Minified'}
                        </button>
                    </div>
                )}
            </div>
            <div className="flex-grow bg-gray-900 rounded-md flex relative overflow-hidden">
                {isLoading ? (
                    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center">
                        <Spinner />
                        <p className="text-white mt-2 text-sm">Crafting your story...</p>
                    </div>
                ) : story ? (
                    <div className="w-full h-full overflow-y-auto p-2" style={{ scrollbarWidth: 'thin' }}>
                        {viewMode === 'scenes' ? (
                            <div className="space-y-4">
                                {story.map((scene) => (
                                    <SceneItem key={scene.scene_number} scene={scene} />
                                ))}
                            </div>
                        ) : (
                            <pre className="whitespace-pre-wrap break-words p-4 font-mono text-sm text-lime-300"><code>{JSON.stringify(story, null, 2)}</code></pre>
                        )}
                    </div>
                ) : (
                    <div className="m-auto text-center text-gray-500">
                        <StoryIcon />
                        <p>Your generated story will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryPanel;