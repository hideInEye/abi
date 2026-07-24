import React, { useRef, useEffect } from 'react';
import Quill, { QuillOptions } from 'quill';
import 'quill/dist/quill.snow.css';

export interface ControlledQuillProps {
  value?: string;
  onChange?: (value: string) => void;
  options?: QuillOptions;
  style?: React.CSSProperties;
  className?: string;
}

const ControlledQuill: React.FC<ControlledQuillProps> = ({ value, onChange, options, style, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);
  // 用 ref 保存最新的回调与初始值，避免因依赖变化重复初始化编辑器
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  onChangeRef.current = onChange;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 在容器内部再创建一个子节点用于挂载 Quill，
    // 这样清理时只需清空容器即可移除 Quill 注入的工具栏与编辑区，
    // 避免 React 严格模式下二次挂载产生重复工具栏。
    const editorRoot = container.appendChild(document.createElement('div'));
    const quill = new Quill(editorRoot, {
      theme: 'snow',
      ...options,
    });
    quillRef.current = quill;

    if (valueRef.current) {
      quill.clipboard.dangerouslyPasteHTML(valueRef.current);
    }

    quill.on('text-change', () => {
      // 判断是否有空节点
      const delta = quill.getContents();
      const isEmpty = delta.ops?.length === 1 && delta.ops[0].insert === '\n';
      const html = quill.root.innerHTML;
      onChangeRef.current?.(isEmpty ? '' : html);
    });

    return () => {
      quillRef.current = null;
      container.innerHTML = '';
    };
  }, []);

  return <div className={className} style={style} ref={containerRef} />;
};

export default ControlledQuill;
