import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import styles from './index.module.css';
import { marked } from 'marked';

// 注册自定义格式
// const Block = Quill.import('blots/block');
const Parchment = Quill.import('parchment');

// 创建只读格式
const ReadOnlyFormat = new Parchment.Attributor.Class('readonly', 'ql-readonly', {
  scope: Parchment.Scope.INLINE
});
Quill.register(ReadOnlyFormat);

interface PromptEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnlyRanges?: Array<{ start: number; end: number; }>;
}

export interface PromptEditorHandle {
  getEditor: () => any;
}

const findReadOnlyRanges = (content: string) => {
  const ranges: [number, number][] = [];
  let startIndex = 0;
  let inBrackets = false;
  
  for (let i = 0; i < content.length; i++) {
    if (content[i] === '{') {
      inBrackets = true;
      startIndex = i;
    } else if (content[i] === '}' && inBrackets) {
      inBrackets = false;
      ranges.push([startIndex, i + 1]);
    }
  }
  return ranges;
};


const PromptEditor = forwardRef<PromptEditorHandle, PromptEditorProps>((props, ref) => {
  const { value, onChange } = props;
  const quillRef = useRef<ReactQuill>(null);

  useImperativeHandle(ref, () => ({
    getEditor: () => quillRef.current?.getEditor() || null
  }));

  // 应用只读样式和格式
  // useEffect(() => {
  //   const quill = quillRef.current?.getEditor();
  //   if (!quill) return;

  //   // 清除所有只读格式
  //   quill.formatText(0, quill.getLength(), 'readonly', false, 'silent');

  //   const readOnlyRanges = findReadOnlyRanges(value || '')
  //   // 应用只读格式和样式
  //   if (readOnlyRanges?.length > 0) {
  //     readOnlyRanges.forEach(range => {
  //       if (range && typeof range[0] === 'number' && typeof range[1] === 'number') {
  //         const length = range[1] - range[0];
  //         if (length > 0) {
  //           // 应用只读格式
  //           quill.formatText(range[0], length, 'readonly', true, 'silent');
  //           // 应用样式
  //           quill.formatText(range[0], length, {
  //             'background': '#f3f4f6',
  //             'color': '#374151'
  //           }, 'silent');
  //         }
  //       }
  //     });
  //   }

  //   // 监听选择变化
  //   const handleSelectionChange = (range: any) => {
  //     if (!range || !readOnlyRanges?.length) {
  //       quill.enable();
  //       return;
  //     }

  //     // 检查是否在只读区域
  //     const formats = quill.getFormat(range);
      
  //     if (formats.readonly) {
  //       // 如果在只读区域内，禁用编辑
  //       quill.disable();
  //       // 移动光标到只读区域之外
  //       const nextPos = range.index + range.length;
  //       if (nextPos < quill.getLength()) {
  //         quill.setSelection(nextPos, 0);
  //       } else if (range.index > 0) {
  //         quill.setSelection(range.index - 1, 0);
  //       }
  //     } else {
  //       // 如果不在只读区域内，启用编辑
  //       quill.enable();
  //     }
  //   };

  //   quill.on('selection-change', handleSelectionChange);
    
  //   return () => {
  //     quill.off('selection-change', handleSelectionChange);
  //   };
  // }, [value]);

  // 配置编辑器
  const modules = {
    toolbar: false,
    keyboard: {
      bindings: {
        tab: false
      }
    }
  };

  // 定义支持的格式
  const formats = ['readonly'];

  // 处理markdown格式数据
  const html:any = marked(value)

  return (
    <div className="h-full">
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={html}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder="提示词模板，请注意：{ } 为只读区域，请勿修改"
        className={styles.editor}
      />
    </div>
  );
});

PromptEditor.displayName = 'PromptEditor';

export default PromptEditor; 