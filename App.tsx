
import React, { useState, useMemo } from 'react';

// Import all components
import ImageEditor from './components/ImageEditor.tsx';
import ImageGenerator from './components/ImageGenerator.tsx';
import ImageMixer from './components/ImageMixer.tsx';
import ImageToPrompt from './components/ImageToPrompt.tsx';
import StoryGenerator from './components/StoryGenerator.tsx';
import MovieTrailerGenerator from './components/MovieTrailerGenerator.tsx';
import StoryWriter from './components/StoryWriter.tsx';
import KidsStoryGenerator from './components/KidsStoryGenerator.tsx';
import ScriptOutlineGenerator from './components/ScriptOutlineGenerator.tsx';
import PodcastGenerator from './components/PodcastGenerator.tsx';
import QuotifyGenerator from './components/QuotifyGenerator.tsx';
import SpeakingVoiceover from './components/SpeakingVoiceover.tsx';
import WorkTimer from './components/WorkTimer.tsx';
import AnimatedTitle from './components/AnimatedTitle.tsx';
import FaceSwapper from './components/FaceSwapper.tsx';
import { useAuth } from './components/AuthContext.tsx';
import { useLanguage } from './components/LanguageContext.tsx';
import UserProfile from './components/UserProfile.tsx';
import LicenseManager from './components/LicenseManager.tsx';
import TextToVideo from './components/TextToVideo.tsx';
import ImageToVideo from './components/ImageToVideo.tsx';
import AnimationGenerator from './components/AnimationGenerator.tsx';
import VideoTranslatedScript from './components/VideoTranslatedScript.tsx';
import ImageToVideoPrompt from './components/ImageToVideoPrompt.tsx';
import KhmerStoryGenerator from './components/KhmerStoryGenerator.tsx';
import TriviaGenerator from './components/TriviaGenerator.tsx';
import AnimatedQuoteGenerator from './components/AnimatedQuoteGenerator.tsx';
import VisualStoryGenerator from './components/VisualStoryGenerator.tsx';
import WebtoonGenerator from './components/WebtoonGenerator.tsx';
import VideoTranscriber from './components/VideoTranscriber.tsx';
import ThumbnailGenerator from './components/ThumbnailGenerator.tsx';
import RelaxingMusicGenerator from './components/RelaxingMusicGenerator.tsx';
import CoverSongGenerator from './components/CoverSongGenerator.tsx';
import SettingsMenu from './components/SettingsMenu.tsx';
import VideoCaptionTranslator from './components/VideoCaptionTranslator.tsx';

// Define types for better code management
type MainCategory = 'writing' | 'image' | 'audio';

const App: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<MainCategory>('writing');
  const [activeTool, setActiveTool] = useState<string>('story-writer');
  const { user, isLicensed } = useAuth();
  const { t } = useLanguage();
  
  // Settings State
  const [isDarkMode, setIsDarkMode] = useState(true);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);
  
  // Dynamic tools definition based on language
  const tools = useMemo(() => ({
    writing: {
      'story-writer': { label: t('tool_story_writer'), icon: '🖋️', component: StoryWriter, color: 'from-emerald-500 to-green-600' },
      'video-caption-translator': { label: t('tool_caption_translate'), icon: '📹💬', component: VideoCaptionTranslator, color: 'from-cyan-600 to-blue-700' },
      'webtoon-generator': { label: t('tool_webtoon'), icon: '📱', component: WebtoonGenerator, color: 'from-pink-500 to-rose-500' },
      'kids-story-generator': { label: t('tool_kids_story'), icon: '🎬', component: KidsStoryGenerator, color: 'from-amber-400 to-orange-500' },
      'khmer-story-generator': { label: t('tool_khmer_story'), icon: '🇰🇭', component: KhmerStoryGenerator, color: 'from-blue-600 to-red-600' },
      'video-transcriber': { label: t('tool_video_transcriber'), icon: '📝📹', component: VideoTranscriber, color: 'from-cyan-500 to-blue-500' },
      'trivia-generator': { label: t('tool_trivia_generator'), icon: '❓', component: TriviaGenerator, color: 'from-purple-500 to-indigo-500' },
      'visual-story': { label: t('tool_visual_story'), icon: '🖼️📝', component: VisualStoryGenerator, color: 'from-cyan-500 to-blue-500' },
      'story-generator': { label: t('tool_story_gen'), icon: '📖', component: StoryGenerator, color: 'from-cyan-500 to-blue-600' },
      'script-outline': { label: t('tool_script_outline'), icon: '📝', component: ScriptOutlineGenerator, color: 'from-indigo-500 to-violet-600' },
      'movie-trailer': { label: t('tool_movie_trailer'), icon: '🎟️', component: MovieTrailerGenerator, color: 'from-red-600 to-rose-600' },
      'quotify': { label: t('tool_quotify'), icon: '💬', component: QuotifyGenerator, color: 'from-yellow-400 to-amber-500' },
    },
    image: {
      'generate': { label: t('tool_gen_image'), icon: '✨', component: ImageGenerator, color: 'from-pink-500 to-rose-500' },
      'thumbnail-generator': { label: t('tool_thumbnail_generator'), icon: '🖼️', component: ThumbnailGenerator, color: 'from-red-500 to-orange-600' },
      'animated-quote': { label: t('tool_animated_quote'), icon: '📜✨', component: AnimatedQuoteGenerator, color: 'from-emerald-400 to-cyan-500' },
      'edit': { label: t('tool_edit_image'), icon: '🎨', component: ImageEditor, color: 'from-fuchsia-500 to-purple-600' },
      'image-mixer': { label: t('tool_mix_image'), icon: '➕', component: ImageMixer, color: 'from-violet-600 to-indigo-600' },
      'image-to-prompt': { label: t('tool_img_prompt'), icon: '📝', component: ImageToPrompt, color: 'from-lime-500 to-green-500' },
      'face-swapper': { label: t('tool_face_swap'), icon: '😎', component: FaceSwapper, color: 'from-teal-400 to-emerald-500' },
      'image-to-video-prompt': { label: t('tool_img_video_prompt'), icon: '🖼️➡️🎬', component: ImageToVideoPrompt, color: 'from-sky-500 to-blue-600' },
    },
    audio: {
      'podcast': { label: t('tool_podcast'), icon: '🎙️', component: PodcastGenerator, color: 'from-orange-500 to-red-500' },
      'cover-song': { label: t('tool_cover_song'), icon: '🎶', component: CoverSongGenerator, color: 'from-pink-500 to-purple-500' },
      'speaking-voiceover': { label: t('tool_voiceover'), icon: '🎤', component: SpeakingVoiceover, color: 'from-teal-500 to-cyan-600' },
      'relaxing-music': { label: t('tool_relaxing_music'), icon: '🎹', component: RelaxingMusicGenerator, color: 'from-emerald-500 to-teal-500' },
    },
  }), [t]);

  const mainCategories: { key: MainCategory, label: string, icon: string, color: string }[] = useMemo(() => [
      { key: 'writing', label: t('cat_writing'), icon: '✍️', color: 'from-blue-600 to-cyan-500' },
      { key: 'image', label: t('cat_image'), icon: '🎨', color: 'from-purple-600 to-pink-500' },
      { key: 'audio', label: t('cat_audio'), icon: '🎙️', color: 'from-orange-500 to-amber-500' },
  ], [t]);

  const handleCategoryChange = (category: MainCategory) => {
    if (!isLicensed) return;
    setActiveCategory(category);
    // When category changes, set active tool to the first tool in that category
    setActiveTool(Object.keys(tools[category])[0]);
  };

  // Style for main category tabs
  const getCategoryTabClass = (categoryKey: MainCategory, categoryColor: string) => {
    const isDisabled = !isLicensed;
    const baseClasses = "flex items-center justify-center font-bold px-6 py-3 rounded-lg cursor-pointer transition-all duration-300 transform active:scale-[0.97] text-base shadow-md border-b-4";
     if (isDisabled) {
        return `${baseClasses} ${isDarkMode ? 'bg-gray-800 text-gray-500 border-gray-900' : 'bg-gray-200 text-gray-400 border-gray-300'} cursor-not-allowed opacity-60`;
    }
    if (activeCategory === categoryKey) {
      return `${baseClasses} bg-gradient-to-r ${categoryColor} text-white border-white/20 scale-105 shadow-xl ring-1 ring-white/30`;
    }
    return `${baseClasses} ${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700 border-gray-900 hover:text-gray-200' : 'bg-white text-gray-600 hover:bg-gray-100 border-gray-200 hover:text-gray-800'}`;
  };

  // Style for tool/sub-tabs
  const getToolTabClass = (toolKey: string, toolColor: string) => {
    const baseClasses = "flex items-center justify-center font-bold px-4 py-2 rounded-md cursor-pointer transition-all duration-200 transform active:scale-[0.98] text-sm border";
    if (activeTool === toolKey) {
      return `${baseClasses} bg-gradient-to-r ${toolColor} text-white shadow-lg scale-105 border-transparent ring-1 ring-white/20`;
    }
    return `${baseClasses} ${isDarkMode ? 'bg-gray-800/50 text-gray-400 border-gray-700 hover:bg-gray-700 hover:text-gray-200 hover:border-gray-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100 hover:text-gray-800 hover:border-gray-300'}`;
  };
  
  const telegramButtonClasses = `flex items-center gap-2 px-3 py-2 text-sm font-semibold border rounded-lg transition-colors duration-200 transform active:scale-95 ${isDarkMode ? 'text-cyan-300 bg-gray-700/50 border-gray-600 hover:bg-gray-700' : 'text-cyan-700 bg-white border-gray-200 hover:bg-gray-50'}`;

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      <header className={`p-4 w-full flex flex-col items-center flex-wrap gap-4 border-b backdrop-blur-sm transition-colors duration-300 ${isDarkMode ? 'bg-gray-800/50 border-gray-700' : 'bg-white/80 border-gray-200 shadow-sm'}`}>
        <div className="text-center">
            <AnimatedTitle title="អេតមីន - សាល ( AI Tools V.2 Pro )" />
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Create images, videos, and entire stories with the power of AI.</p>
        </div>
         <div className="flex items-center gap-3 sm:gap-6 flex-wrap justify-center">
            {/* Settings Menu - Placed first as requested */}
            <SettingsMenu 
                isDarkMode={isDarkMode} 
                toggleTheme={toggleTheme} 
            />
            
            <div className="flex items-center gap-2">
                <a
                    href="https://t.me/SEYPISAL"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={telegramButtonClasses}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009.894 15V11a1 1 0 112 0v4a1 1 0 00.789 1.106l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                    <span className="hidden xs:inline">{t('chat_admin')}</span>
                    <span className="xs:hidden">Admin</span>
                </a>
                <a
                    href="https://t.me/salmmo2023"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={telegramButtonClasses}
                >
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009.894 15V11a1 1 0 112 0v4a1 1 0 00.789 1.106l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                    <span className="hidden xs:inline">{t('channel_telegram')}</span>
                    <span className="xs:hidden">Channel</span>
                </a>
            </div>
            <WorkTimer />
            <div className={`h-8 w-px hidden sm:block ${isDarkMode ? 'bg-gray-600' : 'bg-gray-300'}`}></div>

            {user && isLicensed ? <UserProfile /> : null}
        </div>
      </header>
      <main className="flex-grow flex flex-col items-center p-4 w-full">
        {isLicensed ? (
          <>
            {/* Main Category Tabs */}
            <div className="mb-6 flex flex-wrap justify-center gap-4 p-2" role="tablist" aria-label="Tool Categories">
                {mainCategories.map(({ key, label, icon, color }) => (
                     <button 
                        key={key}
                        role="tab" 
                        aria-selected={activeCategory === key}
                        onClick={() => handleCategoryChange(key)} 
                        className={getCategoryTabClass(key, color)}
                        disabled={!isLicensed}
                     >
                        <span className="text-2xl mr-3">{icon}</span>
                        {label}
                     </button>
                ))}
            </div>

            {/* Secondary Tool Tabs */}
            <div className={`mb-6 w-full max-w-7xl flex flex-wrap justify-center gap-3 p-4 rounded-xl border shadow-inner transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-100 border-gray-200'}`} role="tablist" aria-label="AI Media Tools">
                {Object.entries(tools[activeCategory] as Record<string, { label: string; icon: string; component: React.FC; color: string }>).map(([toolKey, toolDetails]) => (
                    <button
                        key={toolKey}
                        role="tab" 
                        aria-selected={activeTool === toolKey}
                        onClick={() => setActiveTool(toolKey)}
                        className={getToolTabClass(toolKey, toolDetails.color)}
                    >
                        <span className="text-xl mr-2">{toolDetails.icon}</span>
                        {toolDetails.label}
                    </button>
                ))}
            </div>
            
            <div className="w-full flex-grow">
              {Object.entries(tools).map(([categoryKey, categoryTools]) => (
                Object.entries(categoryTools as Record<string, { component: React.FC }>).map(([toolKey, toolDetails]) => {
                  const Component = toolDetails.component;
                  if (!Component) return null;
                  return (
                    <div
                      key={`${categoryKey}-${toolKey}`}
                      className="h-full"
                      style={{ display: activeCategory === categoryKey && activeTool === toolKey ? 'block' : 'none' }}
                    >
                      <Component />
                    </div>
                  );
                })
              ))}
            </div>
          </>
        ) : (
          <LicenseManager />
        )}
      </main>
      <footer className={`w-full p-4 border-t text-center text-sm transition-colors duration-300 ${isDarkMode ? 'bg-gray-800/50 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`}>
        Copyright © 2026   អេតមីន - សាល  | Admin: SAI (@SEYPISAL)
      </footer>
    </div>
  );
};

export default App;
