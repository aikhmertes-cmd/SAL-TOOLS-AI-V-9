import React, { useState, useEffect } from 'react';

const UploadIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
  </svg>
);

const ImageIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
);


const Spinner: React.FC = () => (
  <svg className="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

interface ImagePanelProps {
  title: string;
  imageDataUrl: string | null;
  isLoading?: boolean;
  onFileChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImagePanel: React.FC<ImagePanelProps> = ({ title, imageDataUrl, isLoading = false, onFileChange }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let intervalId: number | undefined;
    if (isLoading) {
      setProgress(0);
      // Animate to 95% over a simulated duration to give user feedback
      intervalId = window.setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + Math.random() * 5;
          if (newProgress >= 95) {
            if (intervalId) clearInterval(intervalId);
            return 95;
          }
          return newProgress;
        });
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isLoading]);


  return (
    <div className="bg-gray-800/50 rounded-lg p-4 flex flex-col border border-gray-700 aspect-square">
      <h2 className="text-lg font-semibold text-center mb-4 text-gray-300">{title}</h2>
      <div className="flex-grow bg-gray-900 rounded-md flex items-center justify-center relative overflow-hidden">
        {imageDataUrl ? (
          <img src={imageDataUrl} alt={title} className="object-contain w-full h-full" />
        ) : onFileChange ? (
          <div className="w-full h-full">
            <label htmlFor="file-upload" className="flex flex-col items-center justify-center w-full h-full cursor-pointer rounded-md border-2 border-dashed border-gray-700 hover:border-gray-600 hover:bg-gray-800/50 transition-all duration-300 p-6">
                <UploadIcon />
                <span className="font-semibold text-gray-300">Drag & drop an image</span>
                <span className="text-sm text-gray-500 my-2">or</span>
                <div className="inline-flex items-center justify-center px-5 py-2 font-semibold text-white bg-gradient-to-r from-purple-500 to-cyan-500 rounded-lg shadow-lg border-b-4 border-purple-700 hover:from-purple-600 hover:to-cyan-600 transition-all duration-200 transform active:translate-y-0.5 active:border-b-2">
                    <span className="text-lg mr-2">📂</span>
                    <span>Browse Files</span>
                </div>
                <span className="text-sm text-gray-500 mt-2">Supports: PNG, JPG, GIF, WEBP</span>
                <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onFileChange} accept="image/png, image/jpeg, image/webp, image/gif" />
            </label>
          </div>
        ) : (
            <div className="text-center text-gray-500">
                <ImageIcon />
                <p>Your generated image will appear here</p>
            </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center">
            <Spinner />
            <div className="w-full max-w-xs bg-gray-600 rounded-full h-2.5 mt-4">
                <div className="bg-gradient-to-r from-purple-500 to-cyan-500 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.3s ease-in-out' }}></div>
            </div>
            <p className="text-white mt-2 text-sm">Generating... {Math.round(progress)}%</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImagePanel;