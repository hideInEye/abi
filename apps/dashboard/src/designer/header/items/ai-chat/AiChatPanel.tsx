import React, { useCallback, useEffect, useRef, useState } from 'react';
import { message, Popover, Tooltip } from 'antd';
import { DatabaseOutlined, DownOutlined, FileTextOutlined, FolderOpenOutlined, FolderOutlined, RightOutlined } from '@ant-design/icons';
import { observer } from 'mobx-react';
import { getApiTarget, notifyTokenExpired } from '../../../../utils/FetchUtil';
import { getAuthorization } from '../../../../utils/auth';
import baseApi from '../../../../api/BaseApi';
import projectHdStore from '../project/ProjectManager';
import URLUtil from '../../../../utils/URLUtil';
import layerManager from '../../../manager/LayerManager.ts';
import rightStore from '../../../right/RightStore';
import './AiChatPanel.less';
import AiTableResult from './AiTableResult';
import eventOperateStore from '../../../operate-provider/EventOperateStore';

interface TableRow { [key: string]: any; }

/** 选中的数据语义 */
interface SemanticSelectedData {
  name: string;
  schemaId?: number | string;
  /** 数据语义所属分组名 */
  groupName?: string;
}

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
let cachedConvUid = ''; // 已拉取历史的会话 conv_uid
let cachedChatId = '';  // 已拉取历史的会话 session_id
let historyLoaded = false; // 是否已成功拉取过历史（避免组件重挂载重复请求）
let cachedSemanticTree: any[] = []; // 持久化数据语义分组树
let cachedSelectedData: SemanticSelectedData | null = null; // 持久化数据语义选择

// 获取当前时间字符串
function getNow() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 读取当前用户ID（与 chat 对话一致：取 SOY-REACT_userInfo.userId，缺失时为 0）
function getUserId(): number {
  try {
    const userInfoStr = localStorage.getItem('SOY-REACT_userInfo');
    if (userInfoStr) {
      const rawUserId = JSON.parse(userInfoStr)?.userId;
      return rawUserId != null ? Number(rawUserId) : 0;
    }
  } catch {
    // ignore
  }
  return 0;
}

/**
 * 将历史消息接口（/abi-chat/v1/app/message/query）返回的原始消息映射为大屏 ChatMessage。
 * 与 chat 对话同源：roleType 取 roleType || messageDetail.type，内容取 messageDetail.data.content。
 * 大屏只展示 human 与 view（view 为结构化图表数据，映射为 ai 气泡）；ai（思考过程）不展示。
 */
function mapDashboardHistory(rawList: any[]): ChatMessage[] {
  const getRole = (item: any): string => item?.roleType || item?.messageDetail?.type || '';
  const getContent = (item: any): any => item?.messageDetail?.data?.content ?? '';
  const getTime = (item: any): string => {
    const t = item?.createTime;
    if (!t) return '';
    const d = new Date(t);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // view 内容解析：大屏为结构化 JSON 字符串；兼容 <chart-view content="..."/> 包裹形式
  const parseViewContent = (content: any): any => {
    if (content == null) return {};
    if (typeof content !== 'string') return content;
    let str = content;
    const m = str.match(/<chart-view content="([\s\S]*?)"\s*\/>/);
    if (m) str = m[1].replace(/&quot;/g, '"').replace(/NaN/g, 'null');
    try { return JSON.parse(str); } catch { return {}; }
  };
  const getViewChartId = (item: any): string => {
    const ctx = parseViewContent(getContent(item));
    const taskType = ctx.task_type ?? 'development';
    return ctx[taskType]?.chart_id ?? '';
  };

  // human 与 view 成对出现，view 紧跟 human 之后
  const filtered = rawList.filter((item) => {
    const role = getRole(item);
    return role === 'human' || role === 'view';
  });

  return filtered.map((item, i) => {
    const role = getRole(item);
    const time = getTime(item);
    if (role === 'human') {
      // human 的 chartId 从紧跟的 view（下一条）里取
      const nextItem = filtered[i + 1];
      const chartId = nextItem && getRole(nextItem) === 'view' ? getViewChartId(nextItem) : '';
      const content = getContent(item);
      return {
        role: 'human' as const,
        content: typeof content === 'string' ? content : String(content ?? ''),
        time,
        isNew: false,
        chartId,
      };
    }
    // view：解析结构化数据（与实时响应同结构：ctx[task_type].{data,sql,mapping,name,chart_id}）
    const viewCtx = parseViewContent(getContent(item));
    const respTaskType = viewCtx.task_type ?? 'development';
    const devData = viewCtx[respTaskType] ?? {};
    const tableData: TableRow[] | undefined =
      Array.isArray(devData.data) && devData.data.length > 0 ? devData.data : undefined;
    return {
      role: 'ai' as const,
      content: tableData ? '' : (devData.text || devData.content || ''),
      time,
      tableData,
      sql: devData.sql || undefined,
      mapping: devData.mapping,
      chartName: devData.name,
      isNew: true,
      accepted: false,
      chartId: devData.chart_id ?? '',
    };
  });
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
  // 数据语义（分组树：type=group/schema，递归 children）
  const [semanticTree, setSemanticTree] = useState<any[]>(cachedSemanticTree);
  const [selectedData, _setSelectedData] = useState<SemanticSelectedData | null>(cachedSelectedData);
  const [expandedSemGroups, setExpandedSemGroups] = useState<Set<string>>(new Set());
  const [semLoading, setSemLoading] = useState(false);
  const [semDropdownOpen, setSemDropdownOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const convUidRef = useRef<string>('');
  const chatIdRef = useRef<string>('');
  const streamBufferRef = useRef('');

  // 包装 setSelectedData：同时写入模块级缓存
  const setSelectedData = useCallback((data: SemanticSelectedData | null) => {
    cachedSelectedData = data;
    _setSelectedData(data);
  }, []);

  // 展开/收起分组节点（数据已全量返回，无需懒加载）
  const toggleSemGroup = useCallback((nodeId: string) => {
    setExpandedSemGroups(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId); else next.add(nodeId);
      return next;
    });
  }, []);

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

  // 挂载时拉取数据语义分组树
  useEffect(() => {
    const spaceId = Number(localStorage.getItem('spaceId'));
    // 数据语义分组树：命中缓存直接恢复，否则拉取
    if (cachedSemanticTree.length > 0) {
      setSemanticTree(cachedSemanticTree);
    } else {
      setSemLoading(true);
      baseApi.fetchSemanticTree(spaceId)
        .then((list) => { cachedSemanticTree = list; setSemanticTree(list); })
        .catch(() => {})
        .finally(() => setSemLoading(false));
    }
  }, []);

  // 打开大屏时：读取项目绑定的会话（创建大屏时写入 dataJson），并拉取该会话历史消息
  useEffect(() => {
    const dataJson = projectHdStore.projectConfig.dataJson;
    if (!dataJson) return;
    let chatId = '';
    let convUid = '';
    try {
      const parsed = JSON.parse(dataJson);
      chatId = parsed?.chatId ? String(parsed.chatId) : '';
      convUid = parsed?.convUid ? String(parsed.convUid) : '';
    } catch { /* ignore */ }
    // 项目未绑定会话（旧大屏）：跳过历史加载，待用户发送时由 ensureSession 按需补建
    if (!chatId || !convUid) return;
    chatIdRef.current = chatId;
    convUidRef.current = convUid;

    // 命中模块级缓存：同一会话已拉过历史，直接复用（避免组件重挂载/StrictMode 重复请求）
    if (historyLoaded && cachedChatId === chatId) {
      convUidRef.current = cachedConvUid || convUid;
      return;
    }

    baseApi.fetchSessionMessages(convUid)
      .then((rawList) => {
        // 新会话：以历史覆盖全量消息（同时清理跨项目残留的模块级缓存）
        setAllMessages(mapDashboardHistory(rawList));
        cachedChatId = chatId;
        cachedConvUid = convUid;
        historyLoaded = true;
      })
      .catch(() => {});
  }, [projectHdStore.projectConfig.dataJson]);

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

  // 确保存在大屏对话会话：已有 session_id/conv_uid 直接复用；否则调用对话 add 接口
  // (/abi-chat/v1/app/session/add) 新建，拿到后端返回的 session_id 与 conv_uid 两个值。
  const ensureSession = useCallback(async (): Promise<boolean> => {
    if (chatIdRef.current && convUidRef.current) return true;
    const spaceId = Number(localStorage.getItem('spaceId') ?? 0);
    const res = await baseApi.addChatSession({ spaceId, userId: getUserId(), title: '大屏对话' }).catch(() => null);
    if (!res) return false;
    chatIdRef.current = res.sessionId;
    convUidRef.current = res.convUid;
    cachedChatId = res.sessionId;
    cachedConvUid = res.convUid;
    historyLoaded = true;
    // 旧大屏项目按需补建会话：把会话标识回写到项目 dataJson，保证下次打开可拉取历史
    try {
      const { id } = URLUtil.parseUrlParams();
      if (id) {
        const existing = projectHdStore.projectConfig.dataJson;
        const parsed = existing ? JSON.parse(existing) : {};
        const merged = { ...parsed, chatId: res.sessionId, convUid: res.convUid };
        const mergedJson = JSON.stringify(merged);
        projectHdStore.updateProjectConfig({ dataJson: mergedJson });
        await baseApi.updateProject({ id, dataJson: mergedJson });
      }
    } catch { /* ignore */ }
    return true;
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text || loading) return;
    if (!selectedData?.schemaId) {
      message.warning('请先选择数据语义');
      return;
    }

    // 当前选中图表 id（发送时快照）
    const currentChartId = eventOperateStore.targetIds[0] ?? '';
    // dashboardId：从当前选中图表的 type 动态计算（去掉 Antd 前缀）
    const rawType = rightStore.activeElem?.type ?? '';
    const dynamicDashboardId = rawType.startsWith('Antd') ? rawType.slice(4) : rawType;

    // 先确保存在会话：调用对话 add 接口拿到 conv_uid 与 session_id 两个值
    const sessionReady = await ensureSession();
    if (!sessionReady) {
      message.error('创建会话失败，请稍后重试');
      return;
    }

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

    const authorization = getAuthorization();

    // user_id 与 chat 对话保持一致：从 SOY-REACT_userInfo.userId 取，缺失时为 0
    const userId = getUserId();

    const params = {
      messages: text,
      model: 'qwen3:30b-a3b-fp16',
      stream: false,
      temperature: 0,
      max_new_tokens: 4096,
      incremental: false,
      enable_vis: true,
      context: {
        // —— 通用参数：仿照 chat 对话（与对话调用同一 chat/completions 接口）——
        session_id: chatIdRef.current,
        conv_uid: convUidRef.current,
        chat_model_id: 12, // 大模型默认
        space_id: Number(localStorage.getItem('spaceId') ?? 0),
        app_id: 1,
        user_id: userId,
        embed_model_id: 6, // 嵌入模型默认
        last_question: null,
        // —— 大屏专属：对话场景标识 ——
        chat_mode: 'chat_with_dashboard',
        extra: {
          if_debug: true,
          // 数据语义（与 chat 对话一致）
          semantic_id: selectedData?.schemaId ?? null,
          semantic_group_name: selectedData?.groupName || '',
          semantic_name: selectedData?.name || '',
          extra_body: {
            enable_thinking: false,
          },
          // —— 大屏专属参数 ——
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
          ...(authorization ? { Authorization: authorization } : {}),
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
  }, [inputValue, loading, selectedData, dashboardId, chartNameList, taskType, ensureSession]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearHistory = async () => {
    stopGenerating();
    if (convUidRef.current) {
      await baseApi.clearChatConv(convUidRef.current).catch(() => {});
    }
    setAllMessages([]);
    streamBufferRef.current = '';
    // 后端已清空该会话历史：保留当前会话标识与项目绑定不变，仅重置消息与历史加载标记
    cachedMessages = [];
    historyLoaded = false;
    cachedChatId = '';
    cachedConvUid = '';
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

  /** 递归渲染语义节点：文件夹（开/合）/ 空分组（灰、不可展开）/ 叶子（可选中） */
  const renderSemNode = (node: any, depth: number): React.ReactNode => {
    const indent = { paddingLeft: 8 + depth * 16 };
    // 叶子：数据语义，唯一可选中的节点
    if (node.type === 'schema') {
      const isSel = selectedData?.schemaId === node.schemaId;
      return (
        <div key={node.id} className={`ai-sem-leaf ${isSel ? 'selected' : ''}`} style={indent} title={node.techName || node.name}
          onClick={() => { setSelectedData({ name: node.name, schemaId: node.schemaId, groupName: node.groupName }); setSemDropdownOpen(false); }}
        >
          <FileTextOutlined className="ai-sem-leaf-icon" />
          <span className="ai-sem-leaf-name">{node.name}</span>
        </div>
      );
    }
    // 分组：不可选中，按有无子节点分为可展开文件夹 / 灰色空分组
    const children = Array.isArray(node.children) ? node.children : [];
    const hasChildren = children.length > 0;
    if (!hasChildren) {
      return (
        <div key={node.id} className="ai-sem-group-node is-empty" style={indent}>
          <FolderOutlined className="ai-sem-group-icon ai-sem-group-icon--empty" />
          <span className="ai-sem-group-name">{node.name}</span>
        </div>
      );
    }
    const isExpanded = expandedSemGroups.has(node.id);
    const childCount = typeof node.count === 'number' ? node.count : children.length;
    return (
      <div key={node.id} className="ai-sem-group">
        <div className="ai-sem-group-node" style={indent} onClick={() => toggleSemGroup(node.id)}>
          {isExpanded
            ? <FolderOpenOutlined className="ai-sem-group-icon" />
            : <FolderOutlined className="ai-sem-group-icon" />}
          <span className="ai-sem-group-name">{node.name}</span>
          {childCount > 0 && <span className="ai-sem-group-count">{childCount}</span>}
          <span className={`ai-sem-group-chevron ${isExpanded ? 'open' : ''}`}><RightOutlined /></span>
        </div>
        {isExpanded && children.map((child: any) => renderSemNode(child, depth + 1))}
      </div>
    );
  };

  /** 数据语义 Popover 内容（分组文件夹 / 数据语义文件的层级结构） */
  const semanticPopoverContent = (
    <div className="ai-sem-tree">
      {semLoading ? (
        <div className="ai-sem-empty">加载中...</div>
      ) : semanticTree.length === 0 ? (
        <div className="ai-sem-empty">暂无数据语义</div>
      ) : (
        semanticTree.map((node: any) => renderSemNode(node, 0))
      )}
    </div>
  );

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
              选定左侧图表，通过对话即可生成对应图表，
              <br />
              请输入图表数据相关问题开始对话
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
            {/* 数据语义选择 */}
            <div className="sem-selector">
              <Popover
                content={semanticPopoverContent}
                trigger="click"
                placement="topLeft"
                arrow={false}
                open={semDropdownOpen}
                onOpenChange={setSemDropdownOpen}
                rootClassName="ai-sem-popover"
                overlayInnerStyle={{ padding: '6px 8px' }}
              >
                <button type="button" className={`sem-trigger-btn${semDropdownOpen ? ' active' : ''}`} title="选择数据语义">
                  <DatabaseOutlined style={{ fontSize: 14 }} />
                  <span className="sem-trigger-name">{selectedData?.name || '数据语义'}</span>
                  <DownOutlined style={{ fontSize: 9, transition: 'transform 0.2s', transform: semDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                </button>
              </Popover>
            </div>
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
