import React, { useState, useEffect } from 'react';

interface AnimatedTitleProps {
  title: string;
}

const gradients = [
  { class: 'from-purple-400 to-cyan-400', cursor: '#22d3ee' },
  { class: 'from-emerald-400 to-sky-400', cursor: '#38bdf8' },
  { class: 'from-pink-500 to-rose-500', cursor: '#f43f5e' },
  { class: 'from-amber-400 to-orange-500', cursor: '#f97316' },
  { class: 'from-violet-500 to-fuchsia-500', cursor: '#d946ef' },
];

const AnimatedTitle: React.FC<AnimatedTitleProps> = ({ title }) => {
  const [displayedTitle, setDisplayedTitle] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [colorIndex, setColorIndex] = useState(0);
  
  const typingDuration = 6000;
  const pauseDuration = 16000;
  const typingSpeed = typingDuration / title.length;

  useEffect(() => {
    let timeoutId: number;

    const typeCharacter = (index = 0) => {
      if (index < title.length) {
        setDisplayedTitle(prev => prev + title[index]);
        timeoutId = window.setTimeout(() => typeCharacter(index + 1), typingSpeed);
      } else {
        // Typing finished, start pause
        setIsTyping(false);
        timeoutId = window.setTimeout(startOver, pauseDuration);
      }
    };
    
    const startOver = () => {
        setDisplayedTitle('');
        setIsTyping(true);
        // Move to the next color in the cycle
        setColorIndex(prevIndex => (prevIndex + 1) % gradients.length);
        // A short delay before starting to type again for a clean reset
        timeoutId = window.setTimeout(() => typeCharacter(0), 100);
    };

    // Start the first cycle
    timeoutId = window.setTimeout(() => typeCharacter(0), 100);

    return () => clearTimeout(timeoutId);
  }, [title, typingSpeed, pauseDuration]);

  const titleStyle: React.CSSProperties = {
    fontFamily: "'Chakra Petch', sans-serif",
    fontWeight: 700,
    letterSpacing: '1px',
    textShadow: `
      2px 2px 5px rgba(0, 0, 0, 0.7),
      0 0 8px rgba(255, 255, 255, 0.3),
      0 0 15px rgba(255, 255, 255, 0.2),
      0 0 25px rgba(255, 255, 255, 0.1)
    `,
    minHeight: '2.25rem', // From md:text-3xl line-height, prevents layout shift
    display: 'inline-block', // To contain the cursor within its flow
  };

  const currentGradient = gradients[colorIndex];

  const cursorStyle: React.CSSProperties = {
    display: 'inline-block',
    width: '4px',
    height: '1.75rem', // Slightly smaller than the line height for better aesthetics
    backgroundColor: currentGradient.cursor,
    animation: 'blink 1s step-end infinite',
    verticalAlign: 'bottom',
    marginLeft: '2px',
    visibility: isTyping ? 'visible' : 'hidden', // Show only during typing
  };

  return (
    <div 
      className="inline-block p-2 rounded-lg" 
      style={{
        background: 'linear-gradient(-45deg, #1e1b4b, #172554, #082f49, #1e1b4b)',
        backgroundSize: '400% 400%',
        animation: 'gradientBG 15s ease infinite',
      }}
    >
      <style>
      {`
        @import url('https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@700&display=swap');
        @keyframes blink {
          from, to { background-color: transparent }
          50% { background-color: ${currentGradient.cursor} }
        }
        @keyframes gradientBG {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}
      </style>
      <h1 
        className={`text-2xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r ${currentGradient.class}`}
        style={titleStyle}
      >
        {displayedTitle}
        <span style={cursorStyle}></span>
      </h1>
    </div>
  );
};

export default AnimatedTitle;