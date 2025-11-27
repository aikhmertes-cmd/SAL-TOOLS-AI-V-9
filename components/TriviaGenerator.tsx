import React, { useState, useCallback } from 'react';
import { generateTrivia, TriviaQuestion, generateImage } from '../services/geminiService.ts';

// Declare html2canvas on window object
declare global {
    interface Window {
        html2canvas: (element: HTMLElement, options?: any) => Promise<HTMLCanvasElement>;
    }
}

const Spinner: React.FC<{className?: string}> = ({className = "h-5 w-5"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
);

const CopyIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
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

const cardTranslations: Record<string, { explanation: string; reveal: string; hide: string }> = {
    'Khmer': { explanation: 'ការពន្យល់:', reveal: 'បង្ហាញចម្លើយ', hide: 'លាក់ចម្លើយ' },
    'English': { explanation: 'Explanation:', reveal: 'Reveal Answer', hide: 'Hide Answer' },
    'Japanese': { explanation: '解説:', reveal: '答えを見る', hide: '答えを隠す' },
    'Korean': { explanation: '설명:', reveal: '정답 보기', hide: '정답 숨기기' },
    'Chinese': { explanation: '解释:', reveal: '显示答案', hide: '隐藏答案' },
    'French': { explanation: 'Explication:', reveal: 'Révéler la réponse', hide: 'Cacher la réponse' },
    'Spanish': { explanation: 'Explicación:', reveal: 'Mostrar respuesta', hide: 'Ocultar respuesta' },
    'Russian': { explanation: 'Объяснение:', reveal: 'Показать ответ', hide: 'Скрыть ответ' },
    // Fallback for others
    'default': { explanation: 'Explanation:', reveal: 'Reveal Answer', hide: 'Hide Answer' }
};

const triviaStyles = [
    'Pixar 3D', 'Cinematic', 'Pixel Art', 'Funny Cartoon', 'Kid\'s ABC Book',
    'Watercolor', 'Oil Painting', 'Anime', 'Comic Book', 'Low Poly 3D',
    'Claymation', 'Origami', 'Neon Cyberpunk', 'Vintage 1950s', 'Pop Art',
    'Realistic Photography', 'Abstract Art', 'Paper Cutout', 'Charcoal Sketch',
    'Graffiti', 'Ukiyo-e', 'Stained Glass', 'Mosaic'
];

const TriviaGenerator: React.FC = () => {
    const [topic, setTopic] = useState('');
    const [difficulty, setDifficulty] = useState('Medium');
    const [questionCount, setQuestionCount] = useState(5);
    const [genLanguage, setGenLanguage] = useState('English');
    const [selectedStyle, setSelectedStyle] = useState('Pixar 3D');
    const [questions, setQuestions] = useState<TriviaQuestion[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [imageStates, setImageStates] = useState<Record<number, { loading: boolean, url: string | null }>>({});
    const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
    const [copiedStates, setCopiedStates] = useState<Record<number, boolean>>({});
    const [autoGenerateImages, setAutoGenerateImages] = useState(false);
    const [isCapturing, setIsCapturing] = useState<number | null>(null);
    const [generationStatus, setGenerationStatus] = useState<string>('');

    const generationLanguages = ['English', 'Khmer', 'Japanese', 'Korean', 'Chinese', 'French', 'Spanish', 'Russian'];

    const handleGenerateImage = async (index: number, prompt: string) => {
        setImageStates(prev => ({ ...prev, [index]: { loading: true, url: null } }));
        try {
            // Note: The style is already baked into the imagePrompt by generateTrivia, but we generate 1:1 ratio here.
            const url = await generateImage(prompt, '1:1');
            setImageStates(prev => ({ ...prev, [index]: { loading: false, url } }));
        } catch (err) {
            console.error(err);
            setImageStates(prev => ({ ...prev, [index]: { loading: false, url: null } }));
        }
    };

    const handleGenerate = useCallback(async () => {
        if (!topic.trim()) {
            setError('Please enter a topic.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setQuestions([]);
        setImageStates({});
        setRevealedAnswers({});
        setGenerationStatus('Creating questions...');

        try {
            const result = await generateTrivia(topic, questionCount, difficulty, genLanguage, selectedStyle);
            setQuestions(result);
            
            if (autoGenerateImages) {
                // Generate images sequentially with delay to prevent API quota limits
                for (let i = 0; i < result.length; i++) {
                    setGenerationStatus(`Generating image ${i + 1} of ${result.length}...`);
                    setImageStates(prev => ({ ...prev, [i]: { loading: true, url: null } }));
                    
                    try {
                        const url = await generateImage(result[i].imagePrompt, '1:1');
                        setImageStates(prev => ({ ...prev, [i]: { loading: false, url } }));
                    } catch (imgErr) {
                        console.error(`Failed to generate image for q${i}`, imgErr);
                        setImageStates(prev => ({ ...prev, [i]: { loading: false, url: null } }));
                        // Continue loop even if one fails, relying on global retry wrapper if implemented
                    }

                    // Add a safe delay between requests (15000ms = 15 seconds)
                    if (i < result.length - 1) {
                        await new Promise(resolve => setTimeout(resolve, 15000));
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to generate trivia.');
        } finally {
            setIsLoading(false);
            setGenerationStatus('');
        }
    }, [topic, difficulty, questionCount, autoGenerateImages, genLanguage, selectedStyle]);

    const captureCard = async (index: number): Promise<string | null> => {
        const element = document.getElementById(`trivia-card-${index}`);
        if (!element || !(window as any).html2canvas) return null;
        
        setIsCapturing(index);
        try {
            const canvas = await (window as any).html2canvas(element, {
                useCORS: true,
                scale: 2, // Improve quality
                backgroundColor: null, // Use element's background
                ignoreElements: (el: Element) => el.hasAttribute('data-html2canvas-ignore')
            });
            return canvas.toDataURL('image/png');
        } catch (err) {
            console.error('Capture failed:', err);
            return null;
        } finally {
            setIsCapturing(null);
        }
    };

    const handleCopyCard = async (index: number) => {
        const dataUrl = await captureCard(index);
        if (!dataUrl) return;

        try {
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            setCopiedStates(prev => ({ ...prev, [index]: true }));
            setTimeout(() => setCopiedStates(prev => ({ ...prev, [index]: false })), 2000);
        } catch (err) {
            console.error('Failed to copy card:', err);
            alert('Failed to copy card to clipboard.');
        }
    };

    const handleDownloadCard = async (index: number) => {
        const dataUrl = await captureCard(index);
        if (!dataUrl) return;

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `trivia-card-${index + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleReveal = (index: number) => {
        setRevealedAnswers(prev => ({ ...prev, [index]: !prev[index] }));
    };

    const handleClear = () => {
        setTopic('');
        setQuestions([]);
        setImageStates({});
        setRevealedAnswers({});
        setError(null);
        setGenerationStatus('');
    }

    const inputClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";
    const tCard = cardTranslations[genLanguage] || cardTranslations['default'];

    return (
        <div className="w-full max-w-5xl mx-auto p-4">
            <ClearProjectButton onClick={handleClear} />
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 mb-8">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Trivia Card Generator</h2>
                    <p className="text-gray-400 mt-1">Create engaging quiz cards with AI-generated questions and visuals.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Topic</label>
                        <input 
                            type="text" 
                            value={topic} 
                            onChange={e => setTopic(e.target.value)} 
                            placeholder="e.g., Solar System, Ancient History" 
                            className={inputClasses}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Difficulty</label>
                        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className={inputClasses}>
                            <option>Easy</option>
                            <option>Medium</option>
                            <option>Hard</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Language</label>
                        <select value={genLanguage} onChange={e => setGenLanguage(e.target.value)} className={inputClasses}>
                            {generationLanguages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold mb-2 text-gray-300">Art Style</label>
                        <select value={selectedStyle} onChange={e => setSelectedStyle(e.target.value)} className={inputClasses}>
                            {triviaStyles.map(style => <option key={style} value={style}>{style}</option>)}
                        </select>
                    </div>
                     <div className="flex items-center justify-between bg-gray-700/30 p-2 rounded-lg border border-gray-600 h-[42px] self-end">
                        <div className="flex items-center gap-2">
                            <label className="text-sm font-semibold text-gray-300 pl-2">Count:</label>
                            <input 
                                type="number" 
                                min="1" 
                                max="10" 
                                value={questionCount} 
                                onChange={e => setQuestionCount(parseInt(e.target.value) || 5)} 
                                className="w-14 bg-gray-600 border border-gray-500 text-white text-sm rounded-md p-1 text-center focus:outline-none focus:border-cyan-500"
                            />
                        </div>
                        <label className="flex items-center cursor-pointer pr-2">
                            <input 
                                type="checkbox" 
                                checked={autoGenerateImages} 
                                onChange={e => setAutoGenerateImages(e.target.checked)} 
                                className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-2"
                            />
                            <span className="ml-2 text-sm font-medium text-gray-300">Auto-generate Images</span>
                        </label>
                    </div>
                </div>
                
                <button 
                    onClick={handleGenerate} 
                    disabled={isLoading || !topic.trim()} 
                    className="w-full px-6 py-3 font-bold text-white bg-gradient-to-r from-purple-600 to-cyan-600 rounded-lg shadow-lg hover:from-purple-700 hover:to-cyan-700 transition-all disabled:opacity-50"
                >
                    {isLoading ? <><Spinner className="inline mr-2 h-4 w-4"/> {generationStatus || 'Generating...'}</> : 'Generate Trivia Cards'}
                </button>
            </div>

            {error && (
                <div className="mb-8 p-4 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    {error}
                </div>
            )}

            {questions.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {questions.map((q, idx) => (
                        <div id={`trivia-card-${idx}`} key={idx} className="bg-white text-gray-900 rounded-xl overflow-hidden shadow-2xl flex flex-col border-4 border-gray-200">
                            {/* Image Section */}
                            <div className="h-48 bg-gray-200 relative flex items-center justify-center overflow-hidden group">
                                {imageStates[idx]?.url ? (
                                    <img src={imageStates[idx].url!} alt="Trivia Visual" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="text-center p-4">
                                        {imageStates[idx]?.loading ? (
                                            <div className="flex flex-col items-center">
                                                <Spinner className="h-8 w-8 text-indigo-600 mb-2"/>
                                                <span className="text-xs text-indigo-600 font-semibold animate-pulse">Creating Art...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <p className="text-gray-500 text-xs mb-2 italic max-w-[200px] mx-auto">Prompt: {q.imagePrompt}</p>
                                                <button 
                                                    onClick={() => handleGenerateImage(idx, q.imagePrompt)} 
                                                    className="px-4 py-2 bg-indigo-600 text-white rounded-full text-sm font-bold hover:bg-indigo-700 transition shadow-md"
                                                    data-html2canvas-ignore
                                                >
                                                    Generate Image
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                                {/* Overlay Buttons - Visible only on hover or when capturing logic handles it, but we use data-html2canvas-ignore */}
                                <div 
                                    className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                                    data-html2canvas-ignore
                                >
                                    <button 
                                        onClick={() => handleCopyCard(idx)}
                                        disabled={isCapturing === idx}
                                        className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition backdrop-blur-sm shadow-lg"
                                        title="Copy Full Card"
                                    >
                                        {copiedStates[idx] ? <span className="text-xs font-bold px-1">✓</span> : <CopyIcon />}
                                    </button>
                                    <button 
                                        onClick={() => handleDownloadCard(idx)}
                                        disabled={isCapturing === idx}
                                        className="p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition backdrop-blur-sm shadow-lg"
                                        title="Download Full Card"
                                    >
                                        {isCapturing === idx ? <Spinner className="h-4 w-4"/> : <DownloadIcon />}
                                    </button>
                                </div>
                            </div>

                            {/* Content Section */}
                            <div className="p-5 flex-grow flex flex-col">
                                <h3 className="text-xl font-bold mb-4 leading-tight">{q.question}</h3>
                                <div className="space-y-2 mb-4 flex-grow">
                                    {q.options.map((opt, i) => (
                                        <div key={i} className={`p-3 rounded-lg border-2 font-medium transition-colors ${revealedAnswers[idx] && opt === q.correctAnswer ? 'bg-green-100 border-green-500 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                                
                                {revealedAnswers[idx] && (
                                    <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800 animate-fade-in">
                                        <strong>{tCard.explanation}</strong> {q.explanation}
                                    </div>
                                )}

                                <button 
                                    onClick={() => toggleReveal(idx)} 
                                    className="w-full py-2 bg-gray-800 text-white font-bold rounded-lg hover:bg-gray-700 transition"
                                    data-html2canvas-ignore
                                >
                                    {revealedAnswers[idx] ? tCard.hide : tCard.reveal}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TriviaGenerator;