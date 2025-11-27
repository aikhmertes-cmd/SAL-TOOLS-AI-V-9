import React, { useState, useEffect } from 'react';

const VideoPlaceholderIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
);

const Spinner: React.FC = () => (
  <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const loadingMessages = [
    "Warming up the AI director...",
    "Storyboarding your scene...",
    "Rendering the first frames...",
    "This can take a few minutes...",
    "Adding cinematic effects...",
    "Applying post-production magic...",
    "Finalizing the video, almost there!",
];

interface VideoPanelProps {
  title: string;
  videoUrl: string | null;
  isLoading?: boolean;
}

const VideoPanel: React.FC<VideoPanelProps> = ({ title, videoUrl, isLoading = false }) => {
    const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

    useEffect(() => {
        if (isLoading) {
            const intervalId = setInterval(() => {
                setCurrentMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
            }, 4000); // Change message every 4 seconds

            return () => clearInterval(intervalId);
        }
    }, [isLoading]);
    
  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 w-full aspect-video mb-4">
      <h2 className="text-lg font-semibold text-center mb-4 text-gray-300">{title}</h2>
      <div className="flex-grow bg-gray-900 rounded-md flex items-center justify-center relative overflow-hidden">
        {videoUrl ? (
            <video src={videoUrl} controls autoPlay loop className="object-contain w-full h-full">
                Your browser does not support the video tag.
            </video>
        ) : !isLoading ? (
            <div className="text-center text-gray-500">
                <VideoPlaceholderIcon />
                <p>Your generated video will appear here</p>
            </div>
        ) : null}
        
        {isLoading && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center transition-opacity duration-300">
            <Spinner />
            <p className="text-white mt-4 text-lg font-semibold animate-pulse">{loadingMessages[currentMessageIndex]}</p>
            <p className="text-gray-400 mt-2 text-sm">Please be patient, high-quality video generation takes time.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPanel;
