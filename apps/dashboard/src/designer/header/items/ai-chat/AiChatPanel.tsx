import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message } from 'antd';
import { getApiTarget, notifyTokenExpired } from '../../../../utils/FetchUtil';
import baseApi from '../../../../api/BaseApi';
import projectHdStore from '../project/ProjectManager';
import URLUtil from '../../../../utils/URLUtil';
import './AiChatPanel.less';
import AiTableResult from './AiTableResult';
import eventOperateStore from '../../../operate-provider/EventOperateStore';

interface TableRow { [key: string]: any; }

interface ChatMessage {
  role: 'human' | 'ai';
  content: string;
  time: string;
  streaming?: boolean;
  /** AI 返回的结构化表格数据 */
  tableData?: TableRow[];
  /** 对应的 SQL 语句 */
  sql?: string;
  /** 字段映射 */
  mapping?: { x字段?: string; y字段?: string };
  /** 图表名称信息 */
  chartName?: { x_name?: string; y_name?: string; title?: string };
  /** 是否为实时对话产生的消息（仅实时消息显示采纳/不采纳） */
  isNew?: boolean;
}

// 获取当前时间字符串
function getNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface AiChatPanelProps {
  onClose?: () => void;
  /** 大屏id（开发态传图表名称，发布态传空） */
  dashboardId?: string;
  /** 图表名称列表（发布态使用） */
  chartNameList?: string[];
  /** task_type: development | release */
  taskType?: 'development' | 'release';
  /** 浮层模式（顶部按钮触发），默认 false（嵌入右侧面板） */
  float?: boolean;
}

const AiChatPanel: React.FC<AiChatPanelProps> = ({
  onClose,
  dashboardId = '',
  chartNameList = [],
  taskType = 'development',
  float = false,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentList, setAgentList] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [agentDropOpen, setAgentDropOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const convUidRef = useRef<string>('');
  const chatIdRef = useRef<string>('');
  const streamBufferRef = useRef('');

  // 挂载时拉取助手列表 + 初始化 chatId / conv_uid
  useEffect(() => {
    const spaceId = Number(localStorage.getItem('spaceId'));
    baseApi.fetchAgentList(spaceId).then(setAgentList).catch(() => {});

    // 从 store 读 chatId（进编辑页时已由 EditorDesignerLoader 存入）
    const dataJson = projectHdStore.projectConfig.dataJson;
    const parsed = dataJson ? JSON.parse(dataJson) : null;
    const chatId = parsed?.chatId ? String(parsed.chatId) : '';
    if (!chatId) return;
    chatIdRef.current = chatId;

    // 拉取已有会话，取第一条 conv_uid 并加载历史消息
    baseApi.fetchChatConvList({
      chat_id: chatId,
      chat_mode: 'chat_with_dashboard',
      space_id: spaceId,
    }).then(async (convList) => {
      if (!convList.length) return;
      const convUid = convList[0].conv_uid ?? '';
      convUidRef.current = convUid;
      if (!convUid) return;

      // 调用 history_round 接口拉取历史消息
      try {
        const apiBase = getApiTarget().replace(/\/api$/, '');
        let histToken = '';
        try { const t = localStorage.getItem('SOY-REACT_token'); if (t && t !== 'undefined' && t !== 'null') histToken = JSON.parse(t); } catch { /* ignore */ }
        const histHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
        if (histToken) histHeaders['Authorization'] = `Bearer ${histToken}`;
        const res = await fetch(`${apiBase}/chat-proxy/api/v1/chat/conv/messages/history_round`, {
          method: 'POST',
          headers: histHeaders,
          body: JSON.stringify({ conv_uid: convUid }),
        });
        const json = await res.json();
        const historyList: any[] = json?.data ?? [];
        if (!historyList.length) return;

        // 只保留 human 和 view，跳过 ai（思考过程）
        const filtered = historyList.filter((item: any) => item.role === 'human' || item.role === 'view');

        const histMsgs: ChatMessage[] = filtered.map((item: any) => {
          const timeStr = item.gmt_created
            ? (() => { const d = new Date(item.gmt_created); const pad = (n: number) => String(n).padStart(2, '0'); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; })()
            : '';

          if (item.role === 'human') {
            return {
              role: 'human' as const,
              content: item.context ?? item.content ?? '',
              time: timeStr,
            };
          }

          // view：解析 context JSON，提取结构化数据
          let tableData: TableRow[] | undefined;
          let respSql: string | undefined;
          let respMapping: any;
          let respChartName: any;
          try {
            const viewCtx = typeof item.context === 'string' ? JSON.parse(item.context) : (item.context ?? {});
            const respTaskType = viewCtx.task_type ?? 'development';
            const devData = viewCtx[respTaskType] ?? {};
            tableData = Array.isArray(devData.data) && devData.data.length > 0 ? devData.data : undefined;
            respSql = devData.sql || undefined;
            respMapping = devData.mapping;
            respChartName = devData.name;
          } catch { /* ignore */ }

          return {
            role: 'ai' as const,
            content: tableData ? '' : '',
            time: timeStr,
            tableData,
            sql: respSql,
            mapping: respMapping,
            chartName: respChartName,
          };
        });

        setMessages(histMsgs);
      } catch { /* ignore */ }
    }).catch(() => {});
  }, []);

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
    if (!selectedAgentId) {
      message.warning('请先选择助手');
      return;
    }

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
    const apiBase = getApiTarget().replace(/\/api$/, '');
    const apiUrl = `${apiBase}/chat-proxy/api/v2/workflow/chat/completions`;

    const storedToken = localStorage.getItem('SOY-REACT_token');
    let authToken = '';
    try {
      if (storedToken && storedToken !== 'undefined' && storedToken !== 'null') {
        authToken = JSON.parse(storedToken);
      }
    } catch {
      // ignore
    }

    let userName = '1';
    try {
      const userInfoStr = localStorage.getItem('SOY-REACT_userInfo');
      if (userInfoStr) {
        userName = JSON.parse(userInfoStr)?.userName || '1';
      }
    } catch {
      // ignore
    }

    const params = {
      messages: text,
      model: 'qwen3:30b-a3b-fp16',
      stream: false,
      temperature: 0.0,
      max_new_tokens: 4096,
      incremental: false,
      enable_vis: true,
      context: {
        conv_uid: convUidRef.current,
        chat_id: chatIdRef.current,
        agent_id: selectedAgentId,
        space_id: String(localStorage.getItem('spaceId') ?? ''),
        app_code: 'chat_with_dashboard',
        chat_mode: 'chat_with_dashboard',
        sys_code: '1',
        user_name: userName,
        extra: {
          task_type: taskType,
          chart_name_list: taskType === 'release' ? chartNameList : [],
          db_name: '',
          dashboard_id: dashboardId,
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

      const json = await response.json();
      // data 字段是 JSON 字符串，需再次 parse
      let parsedResp: any = {};
      try {
        parsedResp = typeof json.data === 'string' ? JSON.parse(json.data) : (json.data ?? {});
      } catch { /* ignore */ }
      
      const respTaskType = parsedResp.task_type ?? 'development';
      const devData = parsedResp[respTaskType] ?? {};
      const tableData: TableRow[] | undefined =
        Array.isArray(devData.data) && devData.data.length > 0 ? devData.data : undefined;
      const respSql: string | undefined = devData.sql || undefined;
      const respMapping = devData.mapping;
      const respChartName = devData.name;
      
      setMessages((prev) => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === 'ai') {
            copy[i] = {
              ...copy[i],
              streaming: false,
              content: tableData ? '' : (devData.text || devData.content || '无数据返回'),
              tableData,
              sql: respSql,
              mapping: respMapping,
              chartName: respChartName,
              isNew: true,
            };
            return copy;
          }
        }
        return prev;
      });
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
  }, [inputValue, loading, selectedAgentId, dashboardId, chartNameList, taskType, updateLastAiMsg]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    stopGenerating();
    // 调用后端清空会话消息接口
    if (convUidRef.current) {
      await baseApi.clearChatConv(convUidRef.current).catch(() => {});
    }
    setMessages([]);
    convUidRef.current = '';
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
    <div className={`ai-chat-panel${float ? ' ai-chat-panel--float' : ''}`}>
      {/* Header */}
      {float && (
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <div className="ai-icon">A</div>
          <span>智能问答</span>
        </div>
        <div className="ai-chat-actions">
          {/* 清空历史 */}
          <button
            className="action-btn"
            title="清空对话"
            onClick={handleClearHistory}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.37" />
            </svg>
          </button>
          {/* 关闭 */}
          {onClose && (
          <button className="action-btn" title="关闭" onClick={onClose}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          )}
        </div>
      </div>
      )}

      {/* Status Bar */}
      <div className="ai-status-bar">
        <div className={`status-dot ${loading ? 'loading' : ''}`} />
        <span className={`status-text ${loading ? 'loading' : ''}`}>
          {loading ? '正在思考中...' : '知识已生效'}
        </span>
        <button
          className="action-btn"
          style={{marginLeft: 'auto'}}
          title="清空历史"
          onClick={handleClearHistory}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 .49-3.37" />
          </svg>
        </button>
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
              {msg.tableData ? (
                <AiTableResult
                  data={msg.tableData}
                  sql={msg.sql}
                  mapping={msg.mapping}
                  chartName={msg.chartName}
                  onAccept={msg.isNew ? (data) => {
                    const selectedIds = eventOperateStore.targetIds;
                    if (!selectedIds || selectedIds.length === 0) {
                      message.warning('请先在大屏中选中一个图表');
                      return;
                    }
                    const controllers = window.LC_ENV?.controllers;
                    if (!controllers) {
                      message.error('图表控制器未初始化');
                      return;
                    }
                    let updated = 0;
                    selectedIds.forEach(id => {
                      const ctrl = controllers[id];
                      if (ctrl) { ctrl.changeData(data); updated++; }
                    });
                    if (updated > 0) {
                      message.success(`已更新 ${updated} 个图表`);
                      // 清除 isNew 标记，避免重复采纳
                      setMessages(prev => prev.map((m, i) => i === idx ? { ...m, isNew: false } : m));
                    } else {
                      message.warning('选中的图表不支持数据更新');
                    }
                  } : undefined}
                  onReject={msg.isNew ? () => {
                    setMessages(prev => prev.map((m, i) => i === idx ? { ...m, isNew: false } : m));
                  } : undefined}
                />
              ) : (
                <>{msg.content}{msg.streaming && <span className="cursor">▌</span>}</>
              )}
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
            placeholder="请输入问题，获取结果"
            rows={2}
            disabled={loading}
          />
          <div className="input-toolbar">
            {/* 助手选择 */}
            {agentList.length > 0 && (
              <div className="agent-selector">
                <div className="agent-select-trigger" onClick={() => setAgentDropOpen(v => !v)}>
                  <span>{selectedAgentId ? agentList.find(a => String(a.agentId) === selectedAgentId)?.bizName || '未知助手' : '请选择助手'}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="12" height="12" style={{marginLeft: 4, transition: 'transform 0.2s', transform: agentDropOpen ? 'rotate(180deg)' : 'none'}}>
                    <polyline points="6 9 12 15 18 9"/>
                  </svg>
                </div>
                {agentDropOpen && (
                  <div className="agent-dropdown">
                    {agentList.map((agent: any) => (
                      <div
                        key={agent.agentId}
                        className={`agent-option${selectedAgentId === String(agent.agentId) ? ' agent-option-active' : ''}`}
                        onClick={() => { setSelectedAgentId(String(agent.agentId)); setAgentDropOpen(false); }}
                      >
                        <div className="agent-option-name">{agent.bizName || `助手${agent.agentId}`}</div>
                        {selectedAgentId === String(agent.agentId) && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" width="14" height="14">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
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
