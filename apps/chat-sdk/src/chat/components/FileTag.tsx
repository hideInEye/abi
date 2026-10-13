import React from 'react';
import { Tag } from 'antd';
import { DownloadOutlined, FileExcelOutlined } from "@ant-design/icons";
import { uploadExcelFile } from '@/service/api/conv';
import { downloadFileByBlob } from '@/utils';
import { showWidgetToast } from './chat-widget/widgetToast';

interface FileTagProps {
  fileId: string | number;
  fileName: string;
  prefixText?: string;
  showDownloadIcon?: boolean;
  showCloseIcon?: boolean;
  backgroundColor?: string;
  textColor?: string;
  onClose?: () => void;
  onDownload?: () => void;
  className?: string;
  style?: React.CSSProperties;
  showFileIcon?: boolean;
}

const FileTag: React.FC<FileTagProps> = ({
  fileId,
  fileName = '',
  prefixText = '文件：',
  showDownloadIcon = false,
  showCloseIcon = true,
  backgroundColor = '#f5f7fa',
  textColor = '#2b2626',
  onClose,
  onDownload,
  className,
  style,
  showFileIcon = true
}) => {
  // 如果没有文件ID，不渲染组件
  if (!fileId || !fileName) return null;

  const handleDownload = async () => {
    try {
      const res = await uploadExcelFile({
        bucket: 'excelfile',
        file_id: fileId
      });
      downloadFileByBlob(res, fileName);
      showWidgetToast('success', '下载成功');
    }
    catch (error) {
      showWidgetToast('error', '下载失败');
    }
  }

  return (
    <Tag
      bordered={false}
      closable={showCloseIcon}
      onClose={onClose}
      style={{
        maxWidth: '80%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        backgroundColor,
        color: textColor,
        ...style,
      }}
      className={className}
      title={`${prefixText}${fileName}`}
    >
      {prefixText}
      {showFileIcon ? <FileExcelOutlined style={{ color: '#1677ff', marginRight: 4 }} /> : <span className='ml-2'></span>}
      {fileName}
      {showDownloadIcon && (
        <span 
          className="ml-2 cursor-pointer" 
          onClick={onDownload}
          style={{ color: '#1677ff' }}
        >
          <DownloadOutlined onClick={handleDownload} />
        </span>
      )}
    </Tag>
  );
};

export default FileTag;