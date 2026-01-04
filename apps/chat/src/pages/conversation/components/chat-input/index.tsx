import { Input, Button } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import AudioRecorder from '../../../../components/AudioRecorder';
import SvgIcon from '../../../../components/SvgIcon';
import UploadDrawer from '../../UploadDrawer';

interface ChatInputProps {
  conv: any;
  loading: boolean;
  onSend: (value: string) => void;
  onStop: () => void;
  deepThinkEnabled: boolean;
  uploadFileEnabled: boolean;
  onToggleDeepThink: () => void;
  onToggleUploadFile: () => void;
  setSelectedExcel: (file: any) => void;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(
  ({ loading, onSend, onStop, deepThinkEnabled,uploadFileEnabled, setSelectedExcel, conv, onToggleDeepThink, onToggleUploadFile }) => {
    const [value, setValue] = useState('');
    const isComposingRef = useRef(false);
    const [uploadFileVisible, setUploadFileVisible] = useState(false);

    const handleSend = useCallback(() => {
      if (!value.trim() || loading) {
        return;
      }
      onSend(value);
      setValue('');
    }, [loading, onSend, value]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (isComposingRef.current) {
            return;
          }
          e.preventDefault();
          handleSend();
        }
      },
      [handleSend]
    );

    const handleCompositionStart = useCallback(() => {
      isComposingRef.current = true;
    }, []);

    const handleCompositionEnd = useCallback(() => {
      isComposingRef.current = false;
    }, []);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue(e.target.value);
      },
      []
    );

    const handleTranscribed = useCallback((text: string) => {
      setValue(text);
    }, []);
    // 附件上传
    const handleUploadBtnClick = useCallback(() => {
      onToggleUploadFile();
      setUploadFileVisible(true);
    }, [onToggleUploadFile]);

    // 上传excel回调
    const handleUploadOk = (file: any) => {
      setSelectedExcel(file);
      setUploadFileVisible(false);
      onToggleUploadFile();
    };

    const handleUploadClose = useCallback(() => {
      setUploadFileVisible(false);
      onToggleUploadFile();
    }, [onToggleUploadFile]);

    return (
      <div className=" m-auto border border-gray-300 rounded-lg px-3 py-2 bg-white">
        <div className="flex items-center mb-2">
          <div className="flex-1">
            <div className="relative flex items-center w-full">
              <Input.TextArea
                autoFocus
                id="input-textarea"
                disabled={loading}
                placeholder={
                  loading
                    ? '正在思考中,请稍后输入'
                    : deepThinkEnabled
                      ? '深度思考模式已开启，请输入您的问题'
                      : '请输入问题，快速获取结果'
                }
                value={value}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                className="pr-16"
                autoSize={{ minRows: 1, maxRows: 4 }}
                style={{
                  border: 'none',
                  boxShadow: 'none',
                  padding: '4px 0',
                  resize: 'none',
                  backgroundColor: 'transparent',
                  cursor: loading ? 'not-allowed' : 'text',
                }}
                styles={{
                  textarea: {
                    border: 'none',
                    boxShadow: 'none',
                    backgroundColor: 'transparent',
                  },
                }}
              />
              <div className="absolute right-0 top-1/2 transform -translate-y-1/2 flex items-center"></div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border-none no-focus-border-btn ${
              deepThinkEnabled ? 'chat-action-btn-active bg-[#e8f0fe] text-[#3470f6]' : 'chat-action-btn text-[#333]'
            }`}
            onClick={onToggleDeepThink}
          >
            <SvgIcon 
              localIcon={deepThinkEnabled ? "thinkingblue" : "thinking"} 
              className="w-4 h-4 cursor-pointer" 
            />
            <span>深度思考</span>
            </Button>
            <Button
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border-none no-focus-border-btn ${
              uploadFileEnabled ? 'chat-action-btn-active bg-[#e8f0fe] text-[#3470f6]' : 'chat-action-btn text-[#333]'
            }`}
            onClick={handleUploadBtnClick}
            title="附件上传"
          >
            <SvgIcon localIcon="file-link" className="w-[22px] h-[22px]" />
            <span>附件上传</span>
          </Button>
          </div>
          <div className="flex items-center gap-3">
            <AudioRecorder
              onTranscribed={handleTranscribed}
              disabled={loading}
            />
            <span
              className="cursor-pointer text-[#8a8a8a] hover:text-[#2E6CF6]"
              onClick={loading ? onStop : handleSend}
            >
              <SvgIcon
                localIcon={loading ? 'stop' : 'send'}
                className={`w-6 h-6 ${
                  loading
                    ? 'text-red-500 hover:text-red-600'
                    : 'text-[#3470f6] hover:text-[#2E6CF6]'
                }`}
              />
            </span>
          </div>
        </div>
        <UploadDrawer
          open={uploadFileVisible}
          conv={conv}
          onOk={handleUploadOk}
          onClose={handleUploadClose}
        />
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
