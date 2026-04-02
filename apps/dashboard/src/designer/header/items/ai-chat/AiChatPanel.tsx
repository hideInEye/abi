import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { getApiTarget, notifyTokenExpired } from '../../../../utils/FetchUtil';
import './AiChatPanel.less';

interface ChatMessage {
  role: 'human' | 'ai';
  content: string;
  time: string;
  streaming?: boolean;
}

// 获取当前时间字符串
function getNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 生成 uuid
function genUid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

interface AiChatPanelProps {
  onClose: () => void;
  /** 大屏id（开发态传图表名称，发布态传空） */
  dashboardId?: string;
  /** 图表名称列表（发布态使用） */
  chartNameList?: string[];
  /** task_type: development | release */
  taskType?: 'development' | 'release';
}

const AiChatPanel: React.FC<AiChatPanelProps> = ({
  onClose,
  dashboardId = '',
  chartNameList = [],
  taskType = 'development',
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const convUidRef = useRef<string>(genUid());
  const chatIdRef = useRef<string>(String(Date.now()));
  const streamBufferRef = useRef('');

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // 更新最后一条 ai 消息内容（流式）
  const updateLastAiMsg = useCallback((content: string, streaming: boolean) => {
    setMessages((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].role === 'ai') {
          copy[i] = { ...copy[i], content, streaming };
          return copy;
        }
      }
      return prev;
    });
  }, []);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      // 停止流式
      setMessages((prev) =>
        prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
      );
    }
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || loading) return;

    setInputValue('');
    setMessages((prev) => [
      ...prev,
      { role: 'human', content: text, time: getNow() },
    ]);

    setLoading(true);
    streamBufferRef.current = '';

    // 先插入一个空的 ai 消息占位
    setMessages((prev) => [
      ...prev,
      { role: 'ai', content: '', time: getNow(), streaming: true },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 构造请求参数
    const apiUrl = `${getApiTarget()}/dashboard/api/v2/workflow/chat/completions`;

    const storedToken = localStorage.getItem('SOY-REACT_token');
    let authToken = '';
    try {
      if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
        authToken = JSON.parse(storedToken);
      }
    } catch {
      // ignore
    }

    const params = {
      messages: text,
      model: 'deepseek-r1:14b',
      stream: true,
      temperature: 0.0,
      max_new_tokens: 4096,
      incremental: true,
      enable_vis: true,
      context: {
        conv_uid: convUidRef.current,
        chat_id: chatIdRef.current,
        agent_id: '1100051234665',
        space_id: '1',
        app_code: 'chat_with_dashboard',
        chat_mode: 'chat_with_dashboard',
        sys_code: '1',
        user_name: '1',
        extra: {
          task_type: taskType,
          chart_name_list: taskType === 'release' ? chartNameList : [],
          db_name: '',
          dashbord_id: taskType === 'development' ? dashboardId : '',
          elements: {},
        },
      },
    };

    let retryCount = 0;
    const maxRetries = 2;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status === 401) {
          notifyTokenExpired();
        }
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let lineBuffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        lineBuffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (!data) continue;

          if (data === '[DONE]') {
            const finalContent = streamBufferRef.current
              .replace(/<think>[\s\S]*?<\/think>/g, '')
              .replace(/\\n/g, '\n')
              .trim();
            updateLastAiMsg(finalContent || streamBufferRef.current, false);
            setLoading(false);
            abortControllerRef.current = null;
            return;
          }

          if (data.includes('chatcmpl')) continue;

          let chunk = data;
          chunk = chunk.replace(/round_index:\d+,?\s*/g, '');
          streamBufferRef.current += chunk;

          let displayContent = streamBufferRef.current;
          const lastOpen = displayContent.lastIndexOf('<think>');
          if (lastOpen >= 0) {
            displayContent = displayContent.substring(lastOpen + 7);
            const closeIdx = displayContent.indexOf('</think>');
            if (closeIdx >= 0) {
              displayContent = displayContent.substring(0, closeIdx);
            }
          }

          displayContent = displayContent.replace(/\\n/g, '\n');
          updateLastAiMsg(displayContent, true);
        }
      }

      // stream ended
      const finalContent = streamBufferRef.current
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .replace(/\\n/g, '\n')
        .trim();
      updateLastAiMsg(finalContent || streamBufferRef.current || '（无响应内容）', false);
      setLoading(false);
      abortControllerRef.current = null;
    } catch (error: any) {
      if (error?.name !== 'AbortError') {
        setLoading(false);
        abortControllerRef.current = null;
        setMessages((prev) =>
          prev.map((m) =>
            m.streaming ? { ...m, streaming: false, content: m.content || '请求异常，请稍后重试' } : m
          )
        );
        if (retryCount <= maxRetries) {
          message.error('AI对话接口异常，请检查系统');
        }
      } else {
        setLoading(false);
        abortControllerRef.current = null;
        setMessages((prev) =>
          prev.map((m) =>
            m.streaming ? { ...m, streaming: false, content: m.content || '已停止生成' } : m
          )
        );
      }
    }
  }, [inputValue, loading, dashboardId, chartNameList, taskType, updateLastAiMsg]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = () => {
    stopGenerating();
    setMessages([]);
    convUidRef.current = genUid();
    chatIdRef.current = String(Date.now());
    streamBufferRef.current = '';
  };

  // 自动调整 textarea 高度
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  return (
    <div className="ai-chat-panel">
      {/* Header */}
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <div className="ai-icon">A</div>
          <span>智能问答</span>
        </div>
        <div className="ai-chat-actions">
          {/* 清空历史 */}
          <button
            className="action-btn"
            title="清空历史"
            onClick={handleClearHistory}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.37" />
            </svg>
          </button>
          {/* 关闭 */}
          <button className="action-btn" title="关闭" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="ai-status-bar">
        <div className={`status-dot ${loading ? 'loading' : ''}`} />
        <span className={`status-text ${loading ? 'loading' : ''}`}>
          {loading ? '正在思考中...' : '知识已生效'}
        </span>
      </div>

      {/* Message List */}
      <div className="ai-chat-messages">
        {messages.length === 0 && (
          <div className="ai-welcome">
            <div className="welcome-title">欢迎使用大屏智能问答</div>
            <div className="welcome-desc">
              通过对话形式轻松获取图表数据分析，
              <br />
              请输入图表名称相关问题进行提问
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`ai-message ${msg.role}`}>
            <div className="message-bubble">
              {msg.content}
              {msg.streaming && <span className="cursor">▌</span>}
            </div>
            <div className="message-time">{msg.time}</div>
          </div>
        ))}

        {/* Loading dots: 仅在 loading 且最后一条不是 ai streaming 时显示 */}
        {loading &&
          (messages.length === 0 ||
            messages[messages.length - 1]?.role !== 'ai') && (
            <div className="ai-loading-msg">
              <span />
              <span />
              <span />
            </div>
          )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="ai-chat-input-area">
        <div className="input-box">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="向「大屏图表」提问，Enter 发送，Shift+Enter 换行"
            rows={2}
            disabled={loading}
          />
          <div className="input-toolbar">
            {loading ? (
              <button className="stop-btn" onClick={stopGenerating} title="停止生成">
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              </button>
            ) : (
              <button
                className="send-btn"
                onClick={handleSend}
                disabled={!inputValue.trim()}
                title="发送"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="input-tips">AI 生成的内容仅供参考，请注意甄别信息准确性</div>
      </div>
    </div>
  );
};

export default AiChatPanel;
