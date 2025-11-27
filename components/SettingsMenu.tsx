
import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from './LanguageContext.tsx';
import type { LanguageCode } from '../utils/translations.ts';

const languages: { code: LanguageCode; name: string; flag: string }[] = [
    { code: 'km', name: 'Cambodia (ខ្មែរ)', flag: '🇰🇭' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'ko', name: 'Korea (한국어)', flag: '🇰🇷' },
    { code: 'ja', name: 'Japan (日本語)', flag: '🇯🇵' },
    { code: 'zh', name: 'China (中文)', flag: '🇨🇳' },
    { code: 'fr', name: 'France (Français)', flag: '🇫🇷' },
    { code: 'es', name: 'Spain (Español)', flag: '🇪🇸' },
    { code: 'it', name: 'Italy (Italiano)', flag: '🇮🇹' },
    { code: 'pt', name: 'Portugal (Português)', flag: '🇵🇹' },
    { code: 'ru', name: 'Russia (Русский)', flag: '🇷🇺' },
];

interface SettingsMenuProps {
    isDarkMode: boolean;
    toggleTheme: () => void;
}

const SettingsMenu: React.FC<SettingsMenuProps> = ({ isDarkMode, toggleTheme }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { language, setLanguage, t } = useLanguage();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-full transition-colors border ${isDarkMode ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-300 border-gray-600' : 'bg-white hover:bg-gray-100 text-gray-700 border-gray-300 shadow-sm'}`}
                title={t('settings')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
            </button>

            {isOpen && (
                <div className={`absolute left-0 mt-2 w-72 max-w-[85vw] rounded-xl shadow-2xl z-[100] p-4 space-y-5 border ${isDarkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-800'}`}>
                    <div className={`flex justify-between items-center border-b pb-3 ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                        <h3 className="text-lg font-bold">{t('settings')}</h3>
                        <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-red-500 text-xl">&times;</button>
                    </div>

                    {/* Dark Mode Toggle */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">{isDarkMode ? '🌙' : '☀️'}</span>
                            <span className="font-medium">{isDarkMode ? t('dark_mode') : t('light_mode')}</span>
                        </div>
                        <button
                            onClick={toggleTheme}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${isDarkMode ? 'bg-cyan-600' : 'bg-gray-300'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${isDarkMode ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>

                    {/* Language Select */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium opacity-80">Language / ភាសា</label>
                        <div className={`rounded-lg border overflow-hidden ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value as LanguageCode)}
                                className={`w-full p-3 text-sm outline-none cursor-pointer ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}
                            >
                                {languages.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.flag} {lang.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* API Key Selection */}
                    <div className="pt-3 border-t border-gray-600 mt-2">
                        <button
                            onClick={() => (window as any).aistudio?.openSelectKey()}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${isDarkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'}`}
                        >
                            <span className="text-xl">🔑</span>
                            <span className="font-medium text-sm">{t('add_api_key')}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SettingsMenu;
