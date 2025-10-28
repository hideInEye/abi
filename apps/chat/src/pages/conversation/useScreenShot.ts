import { useRef } from 'react';
import html2canvas from 'html2canvas';

export const useScreenshot = () => {
  const ref = useRef(null);

  const capture = async (options = {}) => {
    if (!ref.current) return null;
    
    const defaultOptions = {
      scale: 2,
      letterRendering: true,
      // windowWidth: element.scrollWidth,
      // windowHeight: element.scrollHeight,
      useCORS: true,
      logging: false,
      ...options
    };

    try {
      const canvas = await html2canvas(ref.current, defaultOptions);
      return canvas;
    } catch (error) {
      console.error('截图失败:', error);
      return null;
    }
  };

  const download = async (filename = 'screenshot.png', options = {}) => {
    const canvas = await capture(options);
    if (!canvas) return false;
    
    const image = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = image;
    link.download = filename;
    link.click();
    return true;
  };

  return { ref, capture, download };
};