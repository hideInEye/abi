import { useRef } from 'react';
import html2canvas from 'html2canvas';
/**
 * 将 SVG <use> 元素转换为内联 SVG
 * html2canvas 不支持 SVG <use> 元素引用 sprite，需要将其转换为内联 SVG
 */
const inlineSvgUseElements = (container: HTMLElement) => {
  const svgElements = container.querySelectorAll('svg');
  
  svgElements.forEach((svg) => {
    const useElement = svg.querySelector('use');
    if (!useElement) return;
    
    const href = useElement.getAttribute('href') || useElement.getAttribute('xlink:href');
    if (!href) return;
    
    // 获取 sprite 中的 symbol
    const symbolId = href.replace('#', '');
    const symbol = document.getElementById(symbolId);
    
    if (symbol) {
      // 克隆 symbol 的内容到 svg 中
      const clonedContent = symbol.cloneNode(true) as Element;
      
      // 复制 symbol 的 viewBox 到 svg
      const viewBox = symbol.getAttribute('viewBox');
      if (viewBox) {
        svg.setAttribute('viewBox', viewBox);
      }
      
      // 移除 use 元素，添加 symbol 的子元素
      useElement.remove();
      
      // 将 symbol 的子元素添加到 svg
      Array.from(clonedContent.children).forEach((child) => {
        svg.appendChild(child.cloneNode(true));
      });
    }
  });
};

/**
 * 修复 Safari 浏览器下表格渲染问题
 */
const fixTableForSafari = (container: HTMLElement) => {
  // 检测是否为 Safari 浏览器
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  // 修复所有表格的样式
  const tables = container.querySelectorAll('.ant-table');
  tables.forEach((table) => {
    const tableEl = table as HTMLElement;
    // 移除 box-shadow，避免渲染问题
    tableEl.style.setProperty('box-shadow', 'none', 'important');
    
    // 确保表格内容可见
    const tableContent = tableEl.querySelector('.ant-table-content') as HTMLElement;
    if (tableContent) {
      tableContent.style.setProperty('overflow', 'visible', 'important');
    }
    
    // 修复表格 body 的滚动问题
    const tableBody = tableEl.querySelector('.ant-table-body') as HTMLElement;
    if (tableBody) {
      tableBody.style.setProperty('overflow', 'visible', 'important');
    }
    
    // Safari 特定修复
    if (isSafari) {
      // 强制设置表格宽度
      const tableInner = tableEl.querySelector('table') as HTMLElement;
      if (tableInner) {
        tableInner.style.setProperty('width', '100%', 'important');
        tableInner.style.setProperty('table-layout', 'auto', 'important');
      }
      
      // 确保单元格内容可见
      const cells = tableEl.querySelectorAll('td, th');
      cells.forEach((cell) => {
        const cellEl = cell as HTMLElement;
        cellEl.style.setProperty('overflow', 'visible', 'important');
        cellEl.style.setProperty('white-space', 'normal', 'important');
      });
    }
  });
};

// 修复表格滚动容器在截图时的重叠问题
const fixTableScrollForScreenshot = (container: HTMLElement) => {
  container.querySelectorAll('.ant-table-body, .ant-table-content').forEach((el) => {
    const height = el.getBoundingClientRect().height;
    (el as HTMLElement).style.cssText += `height:${height}px!important;max-height:${height}px!important;overflow:hidden!important`;
  });
};
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
      allowTaint: true,
      backgroundColor: '#ffffff',
      ...options
    };

    try {
      const canvas = await html2canvas(ref.current, {
        ...defaultOptions,
        onclone: (clonedDoc, element) => {
          // 处理 SVG <use> 元素，将其转换为内联 SVG
          inlineSvgUseElements(element);
          
          // 修复表格渲染问题（特别是 Safari）
          fixTableForSafari(element);
          
          // 修复表格滚动容器在截图时的重叠问题
          fixTableScrollForScreenshot(element);
          // 调用用户自定义的 onclone（如果有）
          if ((options as any).onclone) {
            (options as any).onclone(clonedDoc, element);
          }
        }
      });
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