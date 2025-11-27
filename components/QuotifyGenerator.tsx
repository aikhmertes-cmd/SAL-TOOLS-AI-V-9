import React, { useState, useCallback } from 'react';
import { generateQuotifyPrompts, enhanceQuotifyPrompts, generateImage } from '../services/geminiService.ts';
import { styles } from './styles.ts';

const Spinner: React.FC<{className?: string}> = ({className = "-ml-1 mr-3 h-5 w-5 text-white"}) => (
    <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const CopyIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2-2H9a2 2 0 01-2-2V9z" />
        <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h6a2 2 0 00-2-2H5z" />
    </svg>
);

const EnhanceIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 00-1 1v1.586l-2.707 2.707a1 1 0 000 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414L8.414 4.586V3a1 1 0 00-1-1H5zM15 5a1 1 0 00-1 1v1.586l-2.707 2.707a1 1 0 000 1.414l4 4a1 1 0 001.414 0l4-4a1 1 0 000-1.414L16.414 7.586V6a1 1 0 00-1-1h-2z" clipRule="evenodd" />
    </svg>
);

const CopyAllIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1z" />
    </svg>
);

const DownloadIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
);

const ImageIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
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


const QuotifyGenerator: React.FC = () => {
    const [speaker, setSpeaker] = useState('Jay Shetty');
    const [numPrompts, setNumPrompts] = useState(8);
    const [style, setStyle] = useState<string>(styles[0].value);
    const [focusOnCharacters, setFocusOnCharacters] = useState(false);
    type QuotifyTab = 'config' | 'style';
    const [activeTab, setActiveTab] = useState<QuotifyTab>('config');
    const [prompts, setPrompts] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copiedPromptIndex, setCopiedPromptIndex] = useState<number | null>(null);
    const [isAllCopied, setIsAllCopied] = useState(false);
    
    // State for managing image generation for each prompt
    const [generatedImages, setGeneratedImages] = useState<Record<number, { loading: boolean; url: string | null; error: string | null }>>({});

    const speakers = [
        // Motivational/Self-Help
        'Jay Shetty', 'Simon Sinek', 'Brené Brown', 'Tony Robbins', 'Mel Robbins', 'Oprah Winfrey',
        'Gary Vaynerchuk', 'Angela Duckworth', 'James Clear', 'Adam Grant', 'Ryan Holiday', 'Mark Manson',
        'Tim Ferriss', 'Jocko Willink', 'David Goggins', 'Wim Hof', 'Lewis Howes', 'Ed Mylett',
        'Tom Bilyeu', 'Vishen Lakhiani', 'Robin Sharma',
        // Business/Tech
        'Steve Jobs', 'Elon Musk', 'Jeff Bezos', 'Bill Gates', 'Mark Zuckerberg', 'Satya Nadella',
        'Sheryl Sandberg', 'Indra Nooyi', 'Warren Buffett', 'Richard Branson', 'Jack Ma', 'Reid Hoffman',
        'Peter Thiel', 'Naval Ravikant', 'Sam Altman', 'Andrew Huberman', 'Lex Fridman',
        // Philosophy/Spirituality
        'Alan Watts', 'Eckhart Tolle', 'Deepak Chopra', 'Ram Dass', 'Thich Nhat Hanh', 'Dalai Lama',
        'Jiddu Krishnamurti', 'Sadhguru', 'Jordan Peterson', 'Sam Harris', 'Yuval Noah Harari',
        'Marcus Aurelius', 'Seneca', 'Epictetus', 'Plato', 'Aristotle', 'Socrates', 'Nietzsche',
        // Science/Education
        'Neil deGrasse Tyson', 'Carl Sagan', 'Richard Feynman', 'Albert Einstein', 'Marie Curie',
        'Jane Goodall', 'David Attenborough', 'Bill Nye', 'Michio Kaku', 'Brian Cox', 'Sal Khan',
        // Arts/Creativity
        'Maya Angelou', 'Elizabeth Gilbert', 'Seth Godin', 'Rick Rubin', 'David Lynch', 'George Lucas',
        'Steven Spielberg', 'Quentin Tarantino', 'Hayao Miyazaki', 'Banksy', 'Yayoi Kusama',
        // Historical/Political
        'Martin Luther King Jr.', 'Nelson Mandela', 'Mahatma Gandhi', 'Winston Churchill',
        'Abraham Lincoln', 'Theodore Roosevelt', 'John F. Kennedy', 'Barack Obama', 'Michelle Obama',
        'Malala Yousafzai', 'Greta Thunberg',
        // Athletes
        'Michael Jordan', 'Kobe Bryant', 'LeBron James', 'Serena Williams', 'Tom Brady', 'Muhammad Ali',
        'Arnold Schwarzenegger'
    ].sort();
    
    const promptNumbers = Array.from({ length: 12 }, (_, i) => i + 1);

    const handleSubmit = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setPrompts([]);
        setGeneratedImages({});
        try {
            const result = await generateQuotifyPrompts(speaker, numPrompts, style, focusOnCharacters);
            setPrompts(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [speaker, numPrompts, style, focusOnCharacters]);
    
    const handleEnhance = useCallback(async () => {
        if (prompts.length === 0) return;
        setIsEnhancing(true);
        setError(null);
        try {
            const enhanced = await enhanceQuotifyPrompts(prompts);
            setPrompts(enhanced);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to enhance prompts.');
        } finally {
            setIsEnhancing(false);
        }
    }, [prompts]);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedPromptIndex(index);
        setTimeout(() => setCopiedPromptIndex(null), 2000);
    };
    
    const handleCopyAll = () => {
        const allPromptsText = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n\n');
        navigator.clipboard.writeText(allPromptsText);
        setIsAllCopied(true);
        setTimeout(() => setIsAllCopied(false), 2000);
    };

    const handleDownload = () => {
        const allPromptsText = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n\n');
        const blob = new Blob([allPromptsText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quotify-prompts-${speaker.toLowerCase().replace(' ', '_')}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleGenerateImage = async (prompt: string, index: number) => {
        setGeneratedImages(prev => ({ ...prev, [index]: { loading: true, url: null, error: null } }));
        try {
            // FORCE the speaker's name at the start of the prompt to ensure the image model draws them.
            const finalPrompt = `${speaker}, ${prompt}`;
            const url = await generateImage(finalPrompt, '1:1');
            setGeneratedImages(prev => ({ ...prev, [index]: { loading: false, url, error: null } }));
        } catch (err) {
            setGeneratedImages(prev => ({ ...prev, [index]: { loading: false, url: null, error: 'Generation failed. Try again.' } }));
        }
    };

    const handleDownloadImage = (url: string, index: number) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = `quotify-image-${index + 1}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleClear = () => {
        setSpeaker('Jay Shetty');
        setNumPrompts(8);
        setPrompts([]);
        setError(null);
        setStyle(styles[0].value);
        setFocusOnCharacters(false);
        setActiveTab('config');
        setCopiedPromptIndex(null);
        setIsAllCopied(false);
        setGeneratedImages({});
    };


    const inputClasses = "w-full bg-gray-700 text-gray-200 placeholder-gray-400 border-2 border-yellow-700/50 rounded-md py-3 px-4 focus:ring-2 focus:ring-yellow-500 focus:outline-none transition duration-200";

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
             <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out forwards;
                }
            `}</style>
            <ClearProjectButton onClick={handleClear} />
            <div className="w-full bg-slate-800/60 p-8 rounded-lg border border-slate-700">
                <h1 className="text-5xl font-bold text-yellow-300 text-center mb-2" style={{ fontFamily: 'Georgia, serif' }}>
                    Quotify 2.1
                </h1>
                <p className="text-center text-gray-400 mb-4">
                    Select a speaker and number of prompts to generate tailored, high-quality prompts.
                </p>
                
                 {/* TABS */}
                <div className="flex border-b border-slate-700 mb-8 mt-4">
                    <button onClick={() => setActiveTab('config')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'config' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-200'}`}>
                        1. Configuration
                    </button>
                    <button onClick={() => setActiveTab('style')} className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'style' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400 hover:text-gray-200'}`}>
                        2. Style & Options
                    </button>
                </div>

                {activeTab === 'config' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade-in">
                        <div>
                            <label htmlFor="speaker-select" className="block text-sm font-medium mb-2 text-gray-300">Choose a Speaker:</label>
                            <select id="speaker-select" value={speaker} onChange={e => setSpeaker(e.target.value)} className={inputClasses}>
                                {speakers.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="prompts-select" className="block text-sm font-medium mb-2 text-gray-300">Number of Prompts:</label>
                            <select id="prompts-select" value={numPrompts} onChange={e => setNumPrompts(Number(e.target.value))} className={inputClasses}>
                                {promptNumbers.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                        </div>
                    </div>
                )}
                
                {activeTab === 'style' && (
                    <div className="space-y-8 mb-8 animate-fade-in">
                        <div>
                             <label className="block text-sm font-medium mb-2 text-gray-300">Choose a Style:</label>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {styles.map(styleOpt => (
                                    <button 
                                        key={styleOpt.name} 
                                        onClick={() => setStyle(styleOpt.value)} 
                                        disabled={isLoading}
                                        className={`px-3 py-2 text-sm font-semibold rounded-md transition w-full disabled:opacity-50 ${style === styleOpt.value ? 'bg-yellow-500 text-slate-900' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                                        {styleOpt.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative flex items-start p-4 bg-slate-900/50 rounded-lg border border-slate-700">
                            <div className="flex h-6 items-center">
                                <input 
                                    id="focusOnCharacters" 
                                    type="checkbox" 
                                    checked={focusOnCharacters} 
                                    onChange={(e) => setFocusOnCharacters(e.target.checked)} 
                                    className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-yellow-500 focus:ring-yellow-600"
                                />
                            </div>
                            <div className="ml-3 text-sm">
                                <label htmlFor="focusOnCharacters" className="font-medium text-gray-300">
                                    Put strong focus on the characters and faces in every shot so they are clear. Please keep/retain them as they are.
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 px-6 py-4 font-bold text-slate-900 bg-orange-500 rounded-lg shadow-lg hover:bg-orange-600 transform transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? (
                        <>
                            <Spinner />
                            Generating...
                        </>
                    ) : (
                        <>
                            <span className="text-lg">✧</span>
                            <span>Generate Prompts</span>
                        </>
                    )}
                </button>
            </div>
            
            {error && (
                <div className="mt-6 p-3 w-full text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                    {error}
                </div>
            )}

            {prompts.length > 0 && (
                <div className="mt-8 w-full">
                    <div className="space-y-4">
                        {prompts.map((prompt, index) => (
                            <div key={index} className="bg-slate-800/40 p-4 rounded-lg border border-slate-700 transition-all hover:border-slate-500">
                                <div className="flex items-start justify-between gap-4">
                                    <p className="text-gray-300 flex-grow text-sm leading-relaxed">
                                        <span className="font-semibold text-yellow-500 mr-2">{index + 1}.</span>
                                        {prompt}
                                    </p>
                                    <div className="flex flex-col gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => handleCopy(prompt, index)}
                                            title="Copy prompt"
                                            className="p-2 text-gray-400 bg-slate-700 rounded-md hover:bg-slate-600 hover:text-white transition-colors duration-200 flex items-center justify-center"
                                        >
                                            {copiedPromptIndex === index ? (
                                                <span className="text-xs text-cyan-400 font-semibold px-1">Copied!</span>
                                            ) : (
                                                <CopyIcon />
                                            )}
                                        </button>
                                        <button 
                                            onClick={() => handleGenerateImage(prompt, index)}
                                            title="Generate Image"
                                            className="p-2 text-gray-400 bg-slate-700 rounded-md hover:bg-slate-600 hover:text-yellow-400 transition-colors duration-200 flex items-center justify-center"
                                            disabled={generatedImages[index]?.loading}
                                        >
                                            <ImageIcon />
                                        </button>
                                    </div>
                                </div>
                                
                                {generatedImages[index] && (
                                    <div className="mt-4 relative bg-slate-900 rounded-lg overflow-hidden border border-slate-600">
                                        {generatedImages[index].loading && (
                                            <div className="flex items-center justify-center p-8">
                                                <Spinner className="h-8 w-8 text-yellow-500"/>
                                                <span className="ml-2 text-gray-400 text-sm">Creating art...</span>
                                            </div>
                                        )}
                                        {generatedImages[index].error && (
                                            <div className="p-4 text-red-400 text-sm text-center">{generatedImages[index].error}</div>
                                        )}
                                        {generatedImages[index].url && (
                                            <div className="relative group">
                                                <img src={generatedImages[index].url!} alt="Generated" className="w-full h-auto max-h-96 object-contain" />
                                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                                                    <button 
                                                        onClick={() => handleDownloadImage(generatedImages[index].url!, index)}
                                                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-full font-bold shadow-xl hover:bg-emerald-500 transition flex items-center gap-2 transform hover:scale-105"
                                                    >
                                                        <DownloadIcon /> Download Image
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button onClick={handleEnhance} disabled={isEnhancing} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 font-bold text-slate-900 bg-yellow-400 rounded-lg shadow-md hover:bg-yellow-500 transition-all duration-200 disabled:opacity-60">
                            {isEnhancing ? <><Spinner className="mr-2"/> Enhancing...</> : <><EnhanceIcon/> Enhance Prompts</>}
                        </button>
                         <button onClick={handleCopyAll} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 font-bold text-slate-900 bg-lime-400 rounded-lg shadow-md hover:bg-lime-500 transition-all duration-200">
                           {isAllCopied ? 'Copied!' : <><CopyAllIcon/> Copy All</>}
                        </button>
                         <button onClick={handleDownload} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 font-bold text-slate-900 bg-green-500 rounded-lg shadow-md hover:bg-green-600 transition-all duration-200">
                           <DownloadIcon/> Download Text
                        </button>
                    </div>

                </div>
            )}
        </div>
    );
};

export default QuotifyGenerator;