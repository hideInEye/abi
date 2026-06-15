import { AudioOutlined, BulbOutlined, CompassOutlined, DownOutlined, FileTextOutlined, MessageOutlined, PaperClipOutlined, PictureOutlined, PlusOutlined, SendOutlined, StopOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Dropdown, Input, message } from 'antd';
import type { MenuProps } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import AudioRecorder from '../../../../components/AudioRecorder';
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
  ({ loading, onSend, onStop, deepThinkEnabled, uploadFileEnabled, setSelectedExcel, conv, onToggleDeepThink, onToggleUploadFile }) => {
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

    const handleUploadBtnClick = useCallback(() => {
      onToggleUploadFile();
      setUploadFileVisible(true);
    }, [onToggleUploadFile]);

    const handleUploadOk = (file: any) => {
      setSelectedExcel(file);
      setUploadFileVisible(false);
      onToggleUploadFile();
    };

    const handleUploadClose = useCallback(() => {
      setUploadFileVisible(false);
      onToggleUploadFile();
    }, [onToggleUploadFile]);

    // ── Dropdown menus ──

    /** + dropdown: 上传文件, 上传图片 (占位) */
    const plusMenuItems: MenuProps['items'] = [
      {
        key: 'upload-file',
        icon: <PaperClipOutlined />,
        label: '上传文件',
        onClick: () => handleUploadBtnClick(),
      },
      {
        key: 'upload-image',
        icon: <PictureOutlined />,
        label: '上传图片',
        onClick: () => message.info('图片上传功能即将上线'),
      },
    ];

    /** 交互 dropdown: 交互, 探索, 报告 with icons */
    const modeMenuItems: MenuProps['items'] = [
      {
        key: 'interact',
        icon: <MessageOutlined />,
        label: '交互',
        onClick: () => {},
      },
      {
        key: 'explore',
        icon: <CompassOutlined />,
        label: '探索',
        onClick: () => {},
      },
      {
        key: 'report',
        icon: <FileTextOutlined />,
        label: '报告',
        onClick: () => {},
      },
    ];

    return (
      <div className="chat-input-glass" style={{ overflow: 'visible' }}>
        {/* Textarea area */}
        <div style={{ padding: '16px 18px 8px' }}>
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
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{
              border: 'none',
              boxShadow: 'none',
              padding: '0',
              resize: 'none',
              backgroundColor: 'transparent',
              cursor: loading ? 'not-allowed' : 'text',
              fontSize: 13,
              color: 'var(--ink)',
              lineHeight: 1.5,
              fontFamily: 'var(--font)',
            }}
            styles={{
              textarea: {
                border: 'none',
                boxShadow: 'none',
                backgroundColor: 'transparent',
              },
            }}
          />
        </div>

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px 10px', gap: 6 }}>
          {/* ── Left side ── */}

          {/* + (upload dropdown) */}
          <Dropdown menu={{ items: plusMenuItems }} trigger={['click']} placement="topLeft">
            <button type="button" className="input-label-btn" title="更多操作">
              <PlusOutlined style={{ fontSize: 14 }} />
            </button>
          </Dropdown>

          {/* 交互 (mode switcher dropdown) */}
          <Dropdown menu={{ items: modeMenuItems }} trigger={['click']} placement="topLeft">
            <button type="button" className="input-label-btn">
              <MessageOutlined style={{ fontSize: 13 }} />
              <span>交互</span>
              <DownOutlined className="btn-arrow" />
            </button>
          </Dropdown>

          {/* 思考 (deep think toggle) - BulbOutlined */}
          <button
            type="button"
            className={`input-label-btn ${deepThinkEnabled ? 'active' : ''}`}
            onClick={onToggleDeepThink}
          >
            <BulbOutlined style={{ fontSize: 14 }} />
            <span>思考</span>
          </button>

          {/* 技能 (placeholder) */}
          <button
            type="button"
            className="input-label-btn"
            onClick={() => message.info('技能功能即将上线')}
          >
            <ThunderboltOutlined style={{ fontSize: 13 }} />
            <span>技能</span>
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* ── Right side ── */}

          {/* Voice Input */}
          <AudioRecorder
            onTranscribed={handleTranscribed}
            disabled={loading}
          />

          {/* Send / Stop Button */}
          <button
            type="button"
            className="send-btn-glass"
            onClick={loading ? onStop : handleSend}
            style={loading ? { background: 'var(--danger)', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' } : {}}
          >
            {loading ? (
              <StopOutlined style={{ fontSize: 16 }} />
            ) : (
              <SendOutlined style={{ fontSize: 16 }} />
            )}
          </button>
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
