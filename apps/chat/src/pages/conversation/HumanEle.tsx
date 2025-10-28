import React from 'react';
import SvgIcon from "../../components/SvgIcon";
import FileTag from "../../components/FileTag"; // 引入文件组件
import {parseMessageContent} from '../../utils';

interface HumanEleProps {
  data: {
    context: string;
    file?: { // 单个文件对象
      file_id: string | number;
      file_name: string;
    };
  };
  id?: string;
}

const HumanEle: React.FC<HumanEleProps> = ({ data, id }) => {
  const contextData = parseMessageContent(data?.context);
  
  // 处理显示内容：如果是对象且有question字段，显示question；否则显示原始内容
  const displayContent = typeof contextData === 'object' && contextData?.question 
    ? contextData.question 
    : contextData;
  
  return (
    <div className="my-6 w-full flex justify-end">
      <div className="max-w-[80%] mr-2 break-words">
        {/* 消息内容气泡 */}
        <div id={id} className="block rounded-lg p-2 text-black text-left" style={{ backgroundColor: '#e8eefb' }}>
          <span style={{ whiteSpace: 'pre-wrap' }}>{displayContent}</span>
        </div>
        
        {/* 文件标签（固定在消息内容下方，不使用绝对定位） */}
        {typeof contextData === 'object' && contextData?.file_id && contextData?.file_name && (
          <FileTag
            fileId={contextData.file_id}
            fileName={contextData.file_name}
            showCloseIcon={false}
            showDownloadIcon={true}
            backgroundColor="#f5f7fa"
            textColor="#2b2626"
            style={{
              display: 'block', // 确保独占一行
              marginTop: '4px', // 与消息内容的间距
              marginLeft: '0', // 左对齐
              width: 'fit-content', // 宽度自适应内容
            }}
          />
        )}
        
        {/* 引用对话标签 */}
        {typeof contextData === 'object' && contextData?.reference_order && contextData?.reference_context && (
          <FileTag
            fileId={contextData.reference_order}
            fileName={contextData.reference_context}
            prefixText="#Dialog"
            showDownloadIcon={false}
            showFileIcon={false}
            showCloseIcon={false}
            backgroundColor="#f5f7fa"
            textColor="#2b2626"
            style={{
              display: 'block', // 确保独占一行
              marginTop: '4px', // 与消息内容的间距
              marginLeft: '0', // 左对齐
              width: 'fit-content', // 宽度自适应内容
            }}
          />
        )}
      </div>

      <SvgIcon className="text-[30px]" localIcon="user" />
    </div>
  );
};

export default HumanEle;