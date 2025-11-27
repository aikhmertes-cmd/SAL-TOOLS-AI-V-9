import React, { useState, useCallback } from 'react';
import { generateScriptOutline, ScriptOutline } from '../services/geminiService.ts';

const uiText = {
  en: {
    title: 'Script Outline Generator',
    description: 'Paste your full story and get a structured outline with chapters.',
    fullStoryLabel: 'Full Story',
    fullStoryPlaceholder: 'Paste your entire story, script, or manuscript here...',
    outlinePromptLabel: 'Outline Prompt',
    outlinePromptPlaceholder: 'e.g., "Create a 5-chapter outline focusing on character arcs"',
    generateButton: 'Generate Outline',
    generatingButton: 'Generating...',
    generatedOutlineTitle: 'Generated Outline',
    placeholder: 'Your generated script outline will appear here.',
    chapter: 'Chapter',
    language: 'Language',
  },
  km: {
    title: 'បង្កើតគ្រោងរឿង',
    description: 'បិទភ្ជាប់រឿងពេញរបស់អ្នក ហើយទទួលបានគ្រោងរឿងដែលមានរចនាសម្ព័ន្ធជាមួយជំពូក។',
    fullStoryLabel: 'រឿងពេញ',
    fullStoryPlaceholder: 'បិទភ្ជាប់រឿង សាច់រឿង ឬសាត្រាស្លឹករឹតទាំងមូលរបស់អ្នកនៅទីនេះ...',
    outlinePromptLabel: 'ប្រអប់បញ្ចូលគ្រោងរឿង',
    outlinePromptPlaceholder: 'ឧ: "បង្កើតគ្រោងរឿង ៥ ជំពូកដែលផ្តោតលើដំណើរតួអង្គ"',
    generateButton: 'បង្កើតគ្រោងរឿង',
    generatingButton: 'កំពុងបង្កើត...',
    generatedOutlineTitle: 'គ្រោងរឿងដែលបានបង្កើត',
    placeholder: 'គ្រោងរឿងដែលបានបង្កើតរបស់អ្នកនឹងបង្ហាញនៅទីនេះ។',
    chapter: 'ជំពូក',
    language: 'Language',
  }
};

const Spinner: React.FC = () => (
    <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
  

const ScriptOutlineGenerator: React.FC = () => {
    const [language, setLanguage] = useState<'en' | 'km'>('km');
    const [fullStory, setFullStory] = useState('');
    const [outlinePrompt, setOutlinePrompt] = useState('');
    const [generatedOutline, setGeneratedOutline] = useState<ScriptOutline | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const T = uiText[language];
    const inputFieldClasses = "bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-cyan-500 focus:border-cyan-500 block w-full p-2.5 placeholder-gray-400";

    const handleSubmit = useCallback(async () => {
        if (!fullStory.trim() || !outlinePrompt.trim()) {
            setError(language === 'en' ? 'Please fill in both the story and the prompt.' : 'សូមបំពេញទាំងរឿង និងប្រអប់បញ្ចូល។');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedOutline(null);

        try {
            const result = await generateScriptOutline(fullStory, outlinePrompt, language);
            setGeneratedOutline(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [fullStory, outlinePrompt, language]);

    const handleClear = () => {
        setFullStory('');
        setOutlinePrompt('');
        setGeneratedOutline(null);
        setError(null);
    };

    return (
        <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 space-y-6 h-fit">
                 <ClearProjectButton onClick={handleClear} />
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">{T.title}</h2>
                        <p className="text-gray-400 mt-1 text-sm">{T.description}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-gray-700 p-1 rounded-lg">
                        <button onClick={() => setLanguage('en')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${language === 'en' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>English</button>
                        <button onClick={() => setLanguage('km')} className={`px-3 py-1 text-sm font-semibold rounded-md transition ${language === 'km' ? 'bg-purple-500 text-white' : 'text-gray-300'}`}>Cambodia</button>
                    </div>
                </div>

                <div>
                    <label htmlFor="fullStory" className="block text-sm font-semibold mb-2 text-gray-300">{T.fullStoryLabel}</label>
                    <textarea
                        id="fullStory"
                        value={fullStory}
                        onChange={(e) => setFullStory(e.target.value)}
                        placeholder={T.fullStoryPlaceholder}
                        className={`${inputFieldClasses} h-48 resize-y`}
                        disabled={isLoading}
                    />
                </div>

                <div>
                    <label htmlFor="outlinePrompt" className="block text-sm font-semibold mb-2 text-gray-300">{T.outlinePromptLabel}</label>
                    <input
                        type="text"
                        id="outlinePrompt"
                        value={outlinePrompt}
                        onChange={(e) => setOutlinePrompt(e.target.value)}
                        placeholder={T.outlinePromptPlaceholder}
                        className={inputFieldClasses}
                        disabled={isLoading}
                    />
                </div>
                 {error && (
                    <div className="p-3 text-center bg-red-900/50 border border-red-700 text-red-300 rounded-lg">
                        {error}
                    </div>
                )}
                <button
                    onClick={handleSubmit}
                    disabled={isLoading || !fullStory.trim() || !outlinePrompt.trim()}
                    className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transform transition-all duration-200 active:translate-y-0.5 active:border-b-2 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isLoading ? T.generatingButton : <><span className="text-xl mr-2">🚀</span><span>{T.generateButton}</span></>}
                </button>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 h-[70vh] min-h-[500px]">
                <h2 className="text-lg font-semibold text-gray-300 mb-4">{T.generatedOutlineTitle}</h2>
                <div className="flex-grow bg-gray-900 rounded-md flex relative overflow-y-auto p-4" style={{ scrollbarWidth: 'thin' }}>
                     {isLoading ? (
                        <div className="m-auto text-center">
                            <Spinner />
                            <p className="text-white mt-2 text-sm">{T.generatingButton}</p>
                        </div>
                    ) : generatedOutline && generatedOutline.outline ? (
                        <div className="w-full space-y-6">
                            {generatedOutline.outline.map((chapter) => (
                                <div key={chapter.chapter} className="bg-gray-800 p-4 rounded-lg border-l-4 border-cyan-500">
                                    <h3 className="text-lg font-bold text-cyan-400">{T.chapter} {chapter.chapter}: {chapter.title}</h3>
                                    <p className="text-gray-300 mt-2 whitespace-pre-wrap">{chapter.summary}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="m-auto text-center text-gray-500">
                            <p>{T.placeholder}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ScriptOutlineGenerator;