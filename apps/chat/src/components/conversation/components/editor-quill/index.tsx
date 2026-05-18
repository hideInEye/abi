import React, { useRef, useEffect } from 'react';
import Quill, { QuillOptions } from 'quill';
import 'quill/dist/quill.snow.css';

export interface ControlledQuillProps {
  value?: string;
  onChange?: (value: string) => void;
  options?: QuillOptions;
  style?: React.CSSProperties;
}

const ControlledQuill: React.FC<ControlledQuillProps> = ({ value, onChange, options, style }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const quillRef = useRef<Quill | null>(null);

  useEffect(() => {
    if (containerRef.current && !quillRef.current) {
      quillRef.current = new Quill(containerRef.current, {
        theme: 'snow',
        ...options,
      });

      quillRef.current.on('text-change', () => {
        // 判断是否有空节点
        const delta = quillRef.current!.getContents();
        const isEmpty = delta.ops?.length === 1 && delta.ops[0].insert === '\n';
        const html = containerRef.current!.querySelector('.ql-editor')!.innerHTML;
        onChange?.(isEmpty ? '' : html);
      });
    }

    return () => {
      if (quillRef.current) {
        quillRef.current.off('text-change');
        quillRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (quillRef.current) {
      const editorHTML = containerRef.current!.querySelector('.ql-editor')!.innerHTML;

      if (value !== editorHTML) {
        quillRef.current.clipboard.dangerouslyPasteHTML(value!);
      }
    }
  }, []);

  return <div style={style} ref={containerRef} />;
};

export default ControlledQuill;
