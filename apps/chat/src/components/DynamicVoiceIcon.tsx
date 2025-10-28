import React from 'react';

interface DynamicVoiceIconProps {
  isActive?: boolean;
  className?: string;
}

const DynamicVoiceIcon: React.FC<DynamicVoiceIconProps> = ({ 
  isActive = false, 
  className = "w-5 h-5" 
}) => {
  return (
    <svg 
      viewBox="0 0 1024 1024" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>
        {`
          .voice-bar {
            transform-origin: center;
            animation: ${isActive ? 'voice-wave 1.5s ease-in-out infinite' : 'none'};
          }
          .voice-bar:nth-child(1) { animation-delay: 0s; }
          .voice-bar:nth-child(2) { animation-delay: 0.3s; }
          .voice-bar:nth-child(3) { animation-delay: 0.6s; }
          .voice-bar:nth-child(4) { animation-delay: 0.9s; }
          
          @keyframes voice-wave {
            0%, 100% { transform: scaleY(1); opacity: 0.7; }
            50% { transform: scaleY(1.5); opacity: 1; }
          }
        `}
      </style>
      <rect className="voice-bar" x="152" y="392" width="60" height="240" rx="30" fill="currentColor" />
      <rect className="voice-bar" x="392" y="112" width="60" height="800" rx="30" fill="currentColor" />
      <rect className="voice-bar" x="632" y="312" width="60" height="400" rx="30" fill="currentColor" />
      <rect className="voice-bar" x="872" y="432" width="60" height="160" rx="30" fill="currentColor" />
    </svg>
  );
};

export default DynamicVoiceIcon;