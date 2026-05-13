import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message, Tooltip } from 'antd';
import { observer } from 'mobx-react';
import { getApiTarget, notifyTokenExpired } from '../../../../utils/FetchUtil';
import baseApi from '../../../../api/BaseApi';
import projectHdStore from '../project/ProjectManager';
import layerManager from '../../../manager/LayerManager.ts';
import rightStore from '../../../right/RightStore';
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
  /** 是否为实时对话产生的消息（仅实时消息可点击采纳星） */
  isNew?: boolean;
  /** 是否已采纳 */
  accepted?: boolean;
  /** 关联的图表 id（用于过滤和互斥） */
  chartId?: string;
}

// 模块级单例缓存（组件销毁重建时不丢失）
let cachedMessages: ChatMessage[] = [];
let cachedConvUid = '';
let cachedChatId = '';
let historyLoaded = false; // 是否已成功拉取过历史
let cachedSelectedAgentId = ''; // 持久化助手选择

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

const AiChatPanel: React.FC<AiChatPanelProps> = observer(({
  onClose,
  dashboardId = '',
  chartNameList = [],
  taskType = 'development',
  float = false,
}) => {
  // 全量消息缓存（所有图表）—— 初始值从模块级缓存恢复
  const [allMessages, _setAllMessages] = useState<ChatMessage[]>(cachedMessages);
  // 展示用消息（按当前选中图表过滤）
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  // 当前选中图表名称
  const [currentChartName, setCurrentChartName] = useState('');

  // 包装 setAllMessages：同时写入模块级缓存
  const setAllMessages = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    _setAllMessages(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cachedMessages = next;
      return next;
    });
  }, []);

  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [agentList, setAgentList] = useState<any[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(cachedSelectedAgentId);
  const [agentDropOpen, setAgentDropOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const convUidRef = useRef<string>('');
  const chatIdRef = useRef<string>('');
  const streamBufferRef = useRef('');

  // 监听选中图表变化 → 更新图表名称 + 过滤消息
  useEffect(() => {
    const chartId = eventOperateStore.targetIds[0] ?? '';
    const name = chartId
      ? (layerManager.layerConfigs[chartId]?.name ?? '')
      : '';
    setCurrentChartName(name);
  }, [eventOperateStore.targetIds]);

  // allMessages 或 targetIds 变化时重新过滤展示
  useEffect(() => {
    const chartId = eventOperateStore.targetIds[0] ?? '';
    if (!chartId) {
      setMessages(allMessages);
    } else {
      // chartId='' 的消息是历史消息（后端无图表标识），始终显示；
      // chartId 有值的实时消息只显示匹配当前图表的
      setMessages(allMessages.filter(m => !m.chartId || m.chartId === chartId));
    }
  }, [allMessages, eventOperateStore.targetIds]);

  // 挂载时拉取助手列表 + 初始化 chatId / conv_uid + 历史消息
  useEffect(() => {
    const spaceId = Number(localStorage.getItem('spaceId'));
    baseApi.fetchAgentList(spaceId).then(setAgentList).catch(() => {});

    const dataJson = projectHdStore.projectConfig.dataJson;
    const parsed = dataJson ? JSON.parse(dataJson) : null;
    const chatId = parsed?.chatId ? String(parsed.chatId) : '';
    if (!chatId) return;
    chatIdRef.current = chatId;

    // ── 缓存命中：已加载过历史，直接恢复 ref，不再调接口 ──
    if (historyLoaded && cachedChatId === chatId) {
      convUidRef.current = cachedConvUid;
      chatIdRef.current = cachedChatId;
      return;
    }

    baseApi.fetchChatConvList({
      chat_id: chatId,
      chat_mode: 'chat_with_dashboard',
      space_id: spaceId,
    }).then(async (convList) => {
      if (!convList.length) return;
      const convUid = convList[0].conv_uid ?? '';
      convUidRef.current = convUid;
      if (!convUid) return;

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

        // 预先解析每条 view 的 chart_id，供同组 human 使用
        // filtered 中 human 和 view 成对出现，view 紧跟在 human 后面
        const getViewChartId = (item: any): string => {
          try {
            const ctx = typeof item.context === 'string' ? JSON.parse(item.context) : (item.context ?? {});
            const taskType = ctx.task_type ?? 'development';
            return ctx[taskType]?.chart_id ?? '';
          } catch { return ''; }
        };

        const histMsgs: ChatMessage[] = filtered.map((item: any, i: number) => {
          const timeStr = item.gmt_created
            ? (() => { const d = new Date(item.gmt_created); const pad = (n: number) => String(n).padStart(2, '0'); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; })()
            : '';

          if (item.role === 'human') {
            // human 的 chartId 从紧跟的 view（下一条）里取
            const nextItem = filtered[i + 1];
            const chartId = nextItem?.role === 'view' ? getViewChartId(nextItem) : '';
            return {
              role: 'human' as const,
              content: item.context ?? item.content ?? '',
              time: timeStr,
              isNew: false,
              chartId,
            };
          }

          // view：解析 context JSON，提取结构化数据
          let tableData: TableRow[] | undefined;
          let respSql: string | undefined;
          let respMapping: any;
          let respChartName: any;
          let viewChartId = '';
          try {
            const viewCtx = typeof item.context === 'string' ? JSON.parse(item.context) : (item.context ?? {});
            const respTaskType = viewCtx.task_type ?? 'development';
            const devData = viewCtx[respTaskType] ?? {};
            tableData = Array.isArray(devData.data) && devData.data.length > 0 ? devData.data : undefined;
            respSql = devData.sql || undefined;
            respMapping = devData.mapping;
            respChartName = devData.name;
            viewChartId = devData.chart_id ?? '';
          } catch { /* ignore */ }

          return {
            role: 'ai' as const,
            content: '',
            time: timeStr,
            tableData,
            sql: respSql,
            mapping: respMapping,
            chartName: respChartName,
            isNew: true,
            accepted: false,
            chartId: viewChartId,
          };
        });

        setAllMessages(histMsgs);
        // 写入模块级缓存标记，下次组件挂载时跳过接口
        cachedConvUid = convUid;
        cachedChatId = chatId;
        historyLoaded = true;
      } catch { /* ignore */ }
    }).catch(() => {});
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const shouldScrollRef = useRef(false);

  useEffect(() => {
    if (shouldScrollRef.current) {
      scrollToBottom();
      shouldScrollRef.current = false;
    }
  }, [messages, scrollToBottom]);

  const stopGenerating = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
      setAllMessages((prev) =>
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

    // 当前选中图表 id（发送时快照）
    const currentChartId = eventOperateStore.targetIds[0] ?? '';
    // dashboardId：从当前选中图表的 type 动态计算（去掉 Antd 前缀）
    const rawType = rightStore.activeElem?.type ?? '';
    const dynamicDashboardId = rawType.startsWith('Antd') ? rawType.slice(4) : rawType;

    setInputValue('');
    shouldScrollRef.current = true;
    // 追加 human 消息到全量缓存
    setAllMessages((prev) => [
      ...prev,
      { role: 'human', content: text, time: getNow(), isNew: false, chartId: currentChartId },
    ]);

    setLoading(true);
    streamBufferRef.current = '';

    // 先插入一个空的 ai 消息占位
    setAllMessages((prev) => [
      ...prev,
      { role: 'ai', content: '', time: getNow(), streaming: true, isNew: false, chartId: currentChartId },
    ]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

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
          dashboard_id: dynamicDashboardId,
          chart_id: currentChartId,
          elements: {},
        },
      },
    };

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
        if (response.status === 401) notifyTokenExpired();
        throw new Error(`HTTP ${response.status}`);
      }

      const json = await response.json();
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

      // 更新 allMessages 中最后一条 ai 占位消息
      shouldScrollRef.current = true;
      setAllMessages((prev) => {
        const copy = [...prev];
        for (let i = copy.length - 1; i >= 0; i--) {
          if (copy[i].role === 'ai' && copy[i].chartId === currentChartId) {
            copy[i] = {
              ...copy[i],
              streaming: false,
              content: tableData ? '' : (devData.text || devData.content || '无数据返回'),
              tableData,
              sql: respSql,
              mapping: respMapping,
              chartName: respChartName,
              isNew: true,
              accepted: false,
            };
            return copy;
          }
        }
        return prev;
      });

      setLoading(false);
      abortControllerRef.current = null;
    } catch (error: any) {
      setLoading(false);
      abortControllerRef.current = null;
      if (error?.name !== 'AbortError') {
        setAllMessages((prev) =>
          prev.map((m) =>
            m.streaming ? { ...m, streaming: false, content: m.content || '请求异常，请稍后重试' } : m
          )
        );
        message.error('AI对话接口异常，请检查系统');
      } else {
        setAllMessages((prev) =>
          prev.map((m) =>
            m.streaming ? { ...m, streaming: false, content: m.content || '已停止生成' } : m
          )
        );
      }
    }
  }, [inputValue, loading, selectedAgentId, dashboardId, chartNameList, taskType]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    stopGenerating();
    if (convUidRef.current) {
      const currentChartId = eventOperateStore.targetIds[0] ?? '';
      await baseApi.clearChatConv(convUidRef.current, currentChartId, 'chat_with_dashboard').catch(() => {});
    }
    setAllMessages([]);
    convUidRef.current = '';
    streamBufferRef.current = '';
    // 重置模块级缓存，下次挂载重新拉取
    cachedMessages = [];
    cachedConvUid = '';
    cachedChatId = '';
    historyLoaded = false;
  };

  /** 切换采纳状态（找到 allMessages 中的对应项） */
  const handleToggleAccept = useCallback((msgIndex: number, data: TableRow[]) => {
    // msgIndex 是 messages（过滤后）中的下标，需找到 allMessages 中对应的项
    const targetMsg = messages[msgIndex];
    if (!targetMsg) return;

    const newAccepted = !targetMsg.accepted;
    const currentChartId = targetMsg.chartId ?? '';

    if (newAccepted) {
      // 采纳：调用 changeData 更新图表
      const controllers = window.LC_ENV?.controllers;
      if (!controllers) {
        message.error('图表控制器未初始化');
        return;
      }
      const ctrl = controllers[currentChartId];
      if (ctrl) {
        ctrl.changeData(data, {
          mapping: targetMsg.mapping,
          name: targetMsg.chartName,
        });
        message.success('已更新图表数据');
      } else {
        message.warning('选中的图表不支持数据更新');
      }
    }

    // 更新 allMessages：互斥逻辑（同一 chartId 下只允许一条 accepted）
    setAllMessages((prev) => {
      // 找到对应的 allMessages 下标（通过引用匹配）
      const allIdx = prev.indexOf(targetMsg);
      return prev.map((m, i) => {
        if (i === allIdx) return { ...m, accepted: newAccepted };
        // 同图表的其他 ai 消息互斥
        if (newAccepted && m.chartId === currentChartId && m.role === 'ai') {
          return { ...m, accepted: false };
        }
        return m;
      });
    });
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  };

  return (
    <div className={`ai-chat-panel${float ? ' ai-chat-panel--float' : ''}`}>
      {/* Header（仅浮层模式） */}
      {float && (
      <div className="ai-chat-header">
        <div className="ai-chat-title">
          <div className="ai-icon">A</div>
          <span>AI {currentChartName ? `· ${currentChartName}` : '智能问答'}</span>
        </div>
        <div className="ai-chat-actions">
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

      {/* Status Bar（嵌入模式也显示图表名称） */}
      <div className="ai-status-bar">
        <div className={`status-dot ${loading ? 'loading' : ''}`} />
        <span className={`status-text ${loading ? 'loading' : ''}`}>
          {loading ? '正在思考中...' : ''}
        </span>
        <Tooltip title="清空对话历史">
          <button
            className="action-btn"
            style={{marginLeft: 'auto'}}
            onClick={handleClearHistory}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
              <polyline points="1 4 1 10 7 10" />
              <path d="M3.51 15a9 9 0 1 0 .49-3.37" />
            </svg>
          </button>
        </Tooltip>
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
            <div className={`message-bubble${msg.tableData && msg.accepted ? ' accepted' : ''}`}>
              {msg.tableData ? (
                <AiTableResult
                  data={msg.tableData}
                  sql={msg.sql}
                  mapping={msg.mapping}
                  chartName={msg.chartName}
                  accepted={msg.accepted}
                  isNew={msg.isNew}
                  onToggleAccept={(data) => handleToggleAccept(idx, data)}
                />
              ) : (
                <>{msg.content}{msg.streaming && <span className="cursor">▌</span>}</>
              )}
            </div>
            {/* 采纳/不采纳按钮：仅 AI 返回表格数据时显示，在气泡外部 */}
            {msg.role === 'ai' && msg.tableData && (
              <div className="ai-accept-btns">
                <button
                  className={`ai-accept-btn${msg.accepted ? ' active' : ''}`}
                  title={msg.accepted ? '取消采纳' : '采纳此结果'}
                  onClick={() => handleToggleAccept(idx, msg.tableData!)}
                >
                  采纳
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
                    stroke="#52c41a" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
                <button
                  className={`ai-reject-btn${!msg.accepted ? ' active' : ''}`}
                  title="不采纳"
                  onClick={() => msg.accepted && handleToggleAccept(idx, msg.tableData!)}
                >
                  不采纳
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none"
                    stroke="#bfbfbf" strokeWidth="2.5"
                    strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                </button>
              </div>
            )}
            <div className="message-time">{msg.time}</div>
          </div>
        ))}

        {/* Loading dots */}
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
                        onClick={() => { 
                          setSelectedAgentId(String(agent.agentId)); 
                          cachedSelectedAgentId = String(agent.agentId);
                          setAgentDropOpen(false); 
                        }}
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
});

export default AiChatPanel;
