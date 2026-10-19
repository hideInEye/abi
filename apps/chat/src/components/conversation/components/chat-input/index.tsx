import { ApiOutlined, BulbOutlined, CheckOutlined, CloseOutlined, CompassOutlined, DownOutlined, EllipsisOutlined, EyeOutlined, FileTextOutlined, FolderOutlined, FolderOpenOutlined, MessageOutlined, PaperClipOutlined, PictureOutlined, PlusOutlined, RightOutlined, SearchOutlined, SendOutlined, StopOutlined, DatabaseOutlined, ToolOutlined } from '@ant-design/icons';
import { Dropdown, Input, message, Popover } from 'antd';
import type { MenuProps } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AudioRecorder from '../../../../components/AudioRecorder';
import { LazyFeatureFallback, RetryableLazy } from '../../../../components/performance/RetryableLazy';
import FileTag from '../../../../components/FileTag';
import { fetchFavoriteList } from '../../../../service/api/abi-system';
import { queryMcpList } from '../../../../service/api/mcp';
import type { ReportSourceVersionFields } from '../../../../service/api/report';
import { fetchSemanticGroups, fetchSemanticDetail } from '../../../../service/api/semantic';
import type { SchemaTable, SchemaField } from '../../../conversation-analysis/schemaFields';
import { getSpaceId } from '../../../../utils/runtime';
import type { ModelOption } from '../chat-header';
import { buildReportSourceVersionFields } from './reportSourceSelection';
import { hasSelectedConversationData } from './sendValidation';
import { matchKeyword } from './popupFilter';
import { buildMcpGroupQuery, isSuccessfulMcpResponse, loadCurrentMcpItems, shouldReloadMcpOnSpaceChange } from './mcpSpaceLoad';
import type { ExploreMcpSource } from '../../exploration-mode/types';
import { createImageAttachment, MAX_IMAGE_COUNT, pickImageFiles, pickImagesFromClipboard, supportsImageInput, type ImageAttachment } from './imageAttachment';

const loadUploadDrawer = () => import('../../UploadDrawer');
const loadSchemaFieldsModal = () => import('../../../conversation-analysis/SchemaFieldsModal');

/** 当前模型不支持多模态（图片输入）时，上传/粘贴图片入口的提示文案 */
const IMAGE_INPUT_BLOCKED_TIP = '当前模型不支持图片识别，请切换支持多模态的模型';

export interface SemanticSelectedData {
  name: string
  schemaId?: number | string
  /** 选中数据语义分组时的真实分组 id（长号）；与 schemaId 互斥，二选一 */
  groupId?: number | string
  /** 数据语义所属分组名（不是对话分组） */
  groupName?: string
}

export type ChatInputModeKey = 'interact' | 'explore' | 'report'

export interface ChatInputSendOptions {
  mode: ChatInputModeKey
  /** 仅报告模式提交使用；普通交互请求不得透传这些字段。 */
  reportSources?: ReportSourceVersionFields
  /** 仅探索模式提交使用，透传所选技能/MCP 版本 id（MCP 带协议与分组 namespaceId，发送侧按协议分流）。 */
  skillSourceVersionIds?: string[]
  mcpSourceVersionIds?: ExploreMcpSource[]
  /** 本条消息携带的图片附件（前端 base64，随三模式请求写入；后端接口就绪后对接）。 */
  images?: ImageAttachment[]
}

type ChatInputMode = {
  key: ChatInputModeKey
  label: string
  desc: string
  icon: React.ReactNode
}

export interface ChatInputProps {
  conv?: any;
  /** 确保存在可用会话（无会话时先创建），返回会话对象 */
  ensureConv?: () => Promise<any>;
  loading: boolean;
  onSend: (value: string, options?: ChatInputSendOptions) => void;
  onStop: () => void;
  deepThinkEnabled: boolean;
  uploadFileEnabled: boolean;
  onToggleDeepThink: () => void;
  onToggleUploadFile: () => void;
  /** 当前选中的模型，用于判断思考按钮是否可关闭 */
  currentModel?: ModelOption | null;
  setSelectedExcel?: (file: any) => void;
  selectedExcel?: any;
  /** 待发送图片附件（base64），由父级持有，三模式共享。 */
  selectedImages?: ImageAttachment[];
  setSelectedImages?: (images: ImageAttachment[]) => void;
  spaceId?: number;
  // 数据语义 props（统一节点树：type=group/schema，递归 children）
  semanticTree?: any[];
  selectedData?: SemanticSelectedData | null;
  onSelectData?: (data: SemanticSelectedData) => void;
  semLoading?: boolean;
  // 外部控制输入值
  externalValue?: string;
  onExternalValueConsumed?: () => void;
  selectedModeKey?: ChatInputModeKey;
  onModeChange?: (mode: ChatInputModeKey) => void;
  // ── 助手会话限定（appId≠0）：候选仅从助手绑定资源里拿 ──
  /** 数据语义弹窗只用该树（扁平 schema 叶子）；null 表示不限制，用全局 semanticTree */
  assistantSemanticTree?: any[] | null;
  /** 技能候选仅用绑定列表；非 null 时跳过全局收藏技能请求 */
  assistantSkills?: ReadonlyArray<{ id: string; bizName: string; latestVersionId: string; skillType: string }> | null;
  /** MCP 候选仅用绑定列表（扁平，无分组）；非 null 时跳过全局 MCP 分组请求 */
  assistantMcps?: ReadonlyArray<{ id: string; name: string; protocol: 'sse' | 'streamable'; sseGroupIds?: ReadonlyArray<string | number>; namespaceId?: string }> | null;
  /** 当前助手身份（appId，普通会话为 '0'）：仅切换助手时清空已选技能/MCP，避免绑定资源引用抖动误清 */
  assistantKey?: string;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(
  ({ loading, onSend, onStop, deepThinkEnabled, setSelectedExcel, selectedExcel, selectedImages, setSelectedImages, conv, ensureConv, onToggleDeepThink, onToggleUploadFile,
    currentModel,
    spaceId,
      selectedModeKey, onModeChange,
    semanticTree = [], selectedData, onSelectData, semLoading,
    externalValue, onExternalValueConsumed,
    assistantSemanticTree, assistantSkills, assistantMcps, assistantKey
  }) => {
    // 当前模型是否支持关闭思考：1 为支持，0 或其他为不支持
    const isSupportCloseThinking = currentModel?.isSupportThinking === 1 || currentModel?.isSupportThinking === '1';
    // 模型存在且不支持关闭思考时，思考按钮为只读并强制点亮
    const thinkingReadOnly = !!currentModel && !isSupportCloseThinking;
    const thinkingActive = thinkingReadOnly || deepThinkEnabled;
    // 模型存在且不支持多模态时，上传/粘贴图片入口只提示不入图
    const imageInputBlocked = !!currentModel && !supportsImageInput(currentModel);
    const [value, setValue] = useState('');
    const isComposingRef = useRef(false);
    const [uploadFileVisible, setUploadFileVisible] = useState(false);
    const [semDropdownOpen, setSemDropdownOpen] = useState(false);
    // 数据语义分组展开/收起（对齐大屏：点文件夹仅原地展开/收起，不可选中）
    const [expandedSemGroups, setExpandedSemGroups] = useState<Set<string>>(new Set());
    const [morePopupOpen, setMorePopupOpen] = useState(false);
    // ── 统一弹窗搜索关键词（技能 / MCP）──
    const [skillSearch, setSkillSearch] = useState('');
    const [mcpSearch, setMcpSearch] = useState('');
    const getModeConfig = useCallback((mode: ChatInputModeKey): ChatInputMode => {
      switch (mode) {
        case 'report':
          return { key: 'report', label: '报告', desc: '深度挖掘，智能洞察', icon: <FileTextOutlined /> };
        case 'explore':
          return { key: 'explore', label: '探索', desc: '自主规划，复杂分析', icon: <CompassOutlined /> };
        default:
          return { key: 'interact', label: '交互', desc: '敏捷问数，基础分析', icon: <MessageOutlined /> };
      }
    }, []);
    const [selectedMode, setSelectedMode] = useState<ChatInputMode>(() => getModeConfig(selectedModeKey || 'interact'));

    // ── 技能状态 ──
    const [skillList, setSkillList] = useState<any[]>([]);
    const [skillLoading, setSkillLoading] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

    // ── MCP 状态 ──
    const [mcpGroups, setMcpGroups] = useState<any[]>([]);
    const [mcpGroupItems, setMcpGroupItems] = useState<Map<number, any[]>>(new Map());
    const [selectedMCPs, setSelectedMCPs] = useState<Set<string>>(new Set());
    const [mcpLoading, setMcpLoading] = useState(false);

    // ── 查看语义 Modal 状态 ──
    const [semModalOpen, setSemModalOpen] = useState(false);
    const [semModalTables, setSemModalTables] = useState<SchemaTable[]>([]);

    // 外部注入文本（如推荐示例点击）
    useEffect(() => {
      if (externalValue) {
        setValue(externalValue);
        onExternalValueConsumed?.();
      }
    }, [externalValue, onExternalValueConsumed]);

    // 仅切换助手时清空已选技能 / MCP，避免携带旧助手资源发送；依赖稳定的助手身份而非资源引用，防止绑定资源重载导致误清。
    useEffect(() => {
      setSelectedSkills(new Set());
      setSelectedMCPs(new Set());
    }, [assistantKey]);

    useEffect(() => {
      // 父容器控制当前模式，输入框只负责展示和把发送 mode 上抛。
      if (!selectedModeKey || selectedModeKey === selectedMode.key) return;
      setSelectedMode(getModeConfig(selectedModeKey));
    }, [getModeConfig, selectedMode.key, selectedModeKey]);

    // 懒加载技能列表（首次 hover 进入技能面板时触发一次）；助手会话直接用绑定候选，不请求全局收藏。
    const skillSpaceId = spaceId ?? getSpaceId();
    const skillLoadStartedRef = useRef(false);
    const skillLoadGenerationRef = useRef(0);
    const previousSkillSpaceIdRef = useRef(skillSpaceId);
    const startSkillLoad = useCallback(async () => {
      if (assistantSkills || skillLoadStartedRef.current || !Number.isFinite(skillSpaceId) || skillSpaceId <= 0) return;
      skillLoadStartedRef.current = true;
      setSkillLoading(true);
      const generation = skillLoadGenerationRef.current;
      // 弹窗只认收藏列表：与技能商店「我的技能」同一套逻辑，仅调 favorite/list（favorType=skill）
      try {
        const res: any = await fetchFavoriteList({ favorType: 'skill', spaceId: skillSpaceId });
        // 空间切换后旧请求可能迟到，不能覆盖新空间的候选或加载状态。
        if (generation !== skillLoadGenerationRef.current) return;
        if (Number(res?.code) !== 200) {
          skillLoadStartedRef.current = false;
          return;
        }
        const rows = res?.rows ?? res?.data?.rows ?? res?.data?.list ?? (Array.isArray(res?.data) ? res.data : []);
        const list = Array.isArray(rows) ? rows : [];
        // 保留行原始字段（latestVersionId/skillType 等提交要用），id/名称做兼容映射
        setSkillList(list.map((r: any) => ({
          ...r,
          id: r.favorId ?? r.favor_id ?? r.skillId ?? r.id,
          bizName: r.bizName ?? r.skillName ?? r.name ?? '',
        })));
      } catch {
        if (generation === skillLoadGenerationRef.current) skillLoadStartedRef.current = false;
      } finally {
        if (generation === skillLoadGenerationRef.current) setSkillLoading(false);
      }
    }, [assistantSkills, skillSpaceId]);

    useEffect(() => {
      if (Object.is(previousSkillSpaceIdRef.current, skillSpaceId)) return;
      const shouldReload = skillLoadStartedRef.current && !assistantSkills;
      previousSkillSpaceIdRef.current = skillSpaceId;
      skillLoadGenerationRef.current += 1;
      skillLoadStartedRef.current = false;
      setSkillList([]);
      setSelectedSkills(new Set());
      setSkillLoading(false);
      // 未打开技能面板时继续按需加载，已加载时按新空间刷新。
      if (shouldReload) void startSkillLoad();
    }, [assistantSkills, skillSpaceId, startSkillLoad]);

    useEffect(() => () => {
      skillLoadGenerationRef.current += 1;
      skillLoadStartedRef.current = false;
    }, []);

    // 懒加载 MCP 分组（首次 hover 进入 MCP 面板时触发一次）；助手会话直接用绑定候选，不请求全局分组。
    const mcpLoadStartedRef = useRef(false);
    const mcpLoadGenerationRef = useRef(0);
    const previousMcpSpaceIdRef = useRef(spaceId);
    const startMcpLoad = useCallback(() => {
      if (assistantMcps || mcpLoadStartedRef.current) return;
      mcpLoadStartedRef.current = true;
      setMcpLoading(true);
      const generation = mcpLoadGenerationRef.current;
      loadCurrentMcpItems<any, any>({
        request: () => fetchSemanticGroups(buildMcpGroupQuery(spaceId, getSpaceId())),
        isCurrent: () => generation === mcpLoadGenerationRef.current,
        isSuccess: isSuccessfulMcpResponse,
        selectItems: (res: any) => res?.data?.data?.pageItems || res?.data || res?.rows || [],
      })
        .then((list) => {
          if (list) {
            setMcpGroups(list);
          } else if (generation === mcpLoadGenerationRef.current) {
            mcpLoadStartedRef.current = false;
          }
        })
        .finally(() => {
          if (generation === mcpLoadGenerationRef.current) setMcpLoading(false);
        });
    }, [spaceId, assistantMcps]);

    // hover MCP 分组时懒加载服务列表（防重入）
    const mcpLoadingGroupsRef = useRef<Set<number>>(new Set());

    useEffect(() => {
      const previousSpaceId = previousMcpSpaceIdRef.current;
      if (String(previousSpaceId ?? '') === String(spaceId ?? '')) return;

      const shouldReload = shouldReloadMcpOnSpaceChange(
        previousSpaceId,
        spaceId,
        mcpLoadStartedRef.current,
        Boolean(assistantMcps),
      );
      previousMcpSpaceIdRef.current = spaceId;
      mcpLoadGenerationRef.current += 1;
      mcpLoadStartedRef.current = false;
      mcpLoadingGroupsRef.current.clear();
      setMcpGroups([]);
      setMcpGroupItems(new Map());
      setSelectedMCPs(new Set());
      setMcpLoading(false);

      if (shouldReload) startMcpLoad();
    }, [assistantMcps, spaceId, startMcpLoad]);

    const loadMcpGroup = useCallback((groupId: number) => {
      if (mcpGroupItems.has(groupId) || mcpLoadingGroupsRef.current.has(groupId)) return;
      mcpLoadingGroupsRef.current.add(groupId);
      const generation = mcpLoadGenerationRef.current;
      loadCurrentMcpItems<any, any>({
        request: () => queryMcpList({ pageNo: 1, pageSize: 100, namespaceId: `s_${groupId}` }),
        isCurrent: () => generation === mcpLoadGenerationRef.current,
        isSuccess: isSuccessfulMcpResponse,
        selectItems: (res: any) => res?.data?.data?.pageItems || res?.data?.records || res?.data?.list || (Array.isArray(res?.data) ? res.data : []),
      })
        .then((list) => {
          if (list) setMcpGroupItems(prev => new Map(prev).set(groupId, list));
        })
        .finally(() => {
          if (generation === mcpLoadGenerationRef.current) mcpLoadingGroupsRef.current.delete(groupId);
        });
    }, [mcpGroupItems]);

    // 查看语义
    const openSchemaModal = () => {
      setMorePopupOpen(false);
      if (!selectedData?.schemaId) { message.info('请先选择数据语义表'); return; }
      const table: SchemaTable = {
        schemaId: selectedData.schemaId,
        bizName: selectedData.name,
        fields: [],
        loading: true,
      };
      setSemModalTables([table]);
      setSemModalOpen(true);
      fetchSemanticDetail(selectedData.schemaId)
        .then((res: any) => {
          const detail = res?.data?.data || res?.data || res;
          const modelDetail = detail?.modelDetail;
          const fields = modelDetail ? parseFieldsFromModelDetail(modelDetail) : [];
          setSemModalTables([{ ...table, fields, loading: false, description: detail?.description || detail?.remark || '' }]);
        })
        .catch(() => setSemModalTables([{ ...table, loading: false }]));
    };

    // 解析 modelDetail 提取字段
    function parseFieldsFromModelDetail(modelDetailStr: string): SchemaField[] {
      try {
        const detail = typeof modelDetailStr === 'string' ? JSON.parse(modelDetailStr) : modelDetailStr;
        const fields: SchemaField[] = [];
        const addFields = (items: any[], semantic: SchemaField['semantic'], semLabel: string) => {
          (items || []).forEach(item => {
            fields.push({
              name: item.originName || item.fieldName || item.techName || '',
              type: item.fieldType || '',
              semantic,
              semLabel,
              description: item.fieldDesc || '',
              tableName: item.tableName || '',
              tableDesc: item.tdesc || item.rtableName || '',
              bizName: item.bizName || '',
              alias: item.alias || '',
            });
          });
        };
        addFields(detail.identifiers, 'pk', '主键');
        const dimensions = detail.dimensions || [];
        addFields(dimensions.filter((d: any) => d.type === 'datetime'), 'date', '日期');
        addFields(dimensions.filter((d: any) => d.type !== 'datetime'), 'dim', '维度');
        addFields(detail.measures, 'metric', '指标');
        return fields;
      } catch { return []; }
    }

    // 探索发送的 MCP 选中项：带出协议与所属分组 namespaceId（s_<groupId>），发送侧按协议分流 sse/streamable 字段。
    // 助手会话取绑定候选；普通会话从已加载的分组服务反查（分组 key 即 register/list 查询用的 groupId）。
    const buildExploreMcpSources = useCallback((): ExploreMcpSource[] => {
      const metaById = new Map<string, { protocol?: string; namespaceId?: string }>();
      if (assistantMcps) {
        assistantMcps.forEach((m) => metaById.set(String(m.id), { protocol: m.protocol, namespaceId: m.namespaceId }));
      } else {
        mcpGroupItems.forEach((items, gid) => {
          items.forEach((m: any) => metaById.set(String(m.id), { protocol: m.protocol ?? m.frontProtocol, namespaceId: `s_${gid}` }));
        });
      }
      return Array.from(selectedMCPs).map((id) => ({ id, ...metaById.get(id) }));
    }, [assistantMcps, mcpGroupItems, selectedMCPs]);

    const handleSend = useCallback(() => {
      if (!value.trim() || loading) return;

      // 先校验再发送和清空，避免父级拦截后用户已经输入的问题丢失。
      if (!hasSelectedConversationData(selectedData, selectedExcel)) {
        message.warning('选择已有数据或上传excel，即可开始对话');
        return;
      }

      if (selectedMode.key === 'explore' && !selectedData?.schemaId) {
        message.warning('探索模式请选择具体数据语义');
        return;
      }

      const options: ChatInputSendOptions = selectedMode.key === 'report'
        ? {
            mode: selectedMode.key,
            reportSources: buildReportSourceVersionFields({
              // 助手会话直接使用绑定候选，SSE MCP 的 id 与详情分组由统一 mapper 组装。
              skills: (assistantSkills ?? skillList) as any[],
              selectedSkillIds: selectedSkills,
              mcps: (assistantMcps ?? Array.from(mcpGroupItems.entries()).flatMap(([groupId, items]) =>
                items.map((mcp) => ({ ...mcp, groupId })))) as any[],
              selectedMcpIds: selectedMCPs,
            }),
          }
        : selectedMode.key === 'explore'
          ? {
              mode: selectedMode.key,
              skillSourceVersionIds: Array.from(selectedSkills),
              mcpSourceVersionIds: buildExploreMcpSources(),
            }
          : { mode: selectedMode.key };

      const images = selectedImagesRef.current;
      onSend(value, images.length ? { ...options, images } : options);
      setValue('');
    }, [assistantMcps, assistantSkills, buildExploreMcpSources, loading, mcpGroupItems, onSend, selectedData, selectedExcel, selectedMCPs, selectedMode.key, selectedSkills, skillList, value]);

    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (isComposingRef.current) return;
          e.preventDefault();
          handleSend();
        }
      },
      [handleSend]
    );

    const handleCompositionStart = useCallback(() => { isComposingRef.current = true; }, []);
    const handleCompositionEnd = useCallback(() => { isComposingRef.current = false; }, []);
    const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => { setValue(e.target.value); }, []);
    const handleTranscribed = useCallback((text: string) => { setValue(text); }, []);

    const handleUploadBtnClick = useCallback(async () => {
      // 上传需要 conv_uid，若当前无会话（如欢迎页）则先创建会话
      if (!conv?.conv_uid && ensureConv) {
        const created = await ensureConv();
        if (!created?.conv_uid) {
          message.error('会话创建失败，无法上传文件');
          return;
        }
      }
      onToggleUploadFile();
      setUploadFileVisible(true);
    }, [conv, ensureConv, onToggleUploadFile]);

    const handleUploadOk = (file: any) => {
      setSelectedExcel?.(file);
      setUploadFileVisible(false);
      onToggleUploadFile();
    };

    const handleRemoveExcel = () => {
      setSelectedExcel?.(null);
    };

    const handleUploadClose = useCallback(() => {
      setUploadFileVisible(false);
      onToggleUploadFile();
    }, [onToggleUploadFile]);

    // ── 图片附件（选择 / 粘贴 / 预览 / 移除）──
    const imageInputRef = useRef<HTMLInputElement>(null);
    const selectedImagesRef = useRef<ImageAttachment[]>([]);
    selectedImagesRef.current = selectedImages ?? [];

    // 逐个转 base64 后合并；超出数量上限的部分忽略并提示。
    const addImageFiles = useCallback(async (files: File[]) => {
      if (!files.length) return;
      const current = selectedImagesRef.current;
      const room = MAX_IMAGE_COUNT - current.length;
      if (room <= 0) {
        message.error(`最多上传 ${MAX_IMAGE_COUNT} 张图片`);
        return;
      }
      const created: ImageAttachment[] = [];
      for (const file of files.slice(0, room)) {
        try {
          created.push(await createImageAttachment(file, current.length + created.length));
        } catch (err) {
          message.error(err instanceof Error ? err.message : '图片处理失败');
        }
      }
      if (created.length) setSelectedImages?.([...current, ...created]);
      if (files.length > room) message.warning(`最多上传 ${MAX_IMAGE_COUNT} 张图片，已忽略多余的 ${files.length - room} 张`);
    }, [setSelectedImages]);

    const handleImageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      void addImageFiles(pickImageFiles(e.target.files));
      // 清空 value 以便再次选择同一文件仍能触发 onChange
      e.target.value = '';
    }, [addImageFiles]);

    // 粘贴截图/图片文件时拦截默认行为并加入附件；粘贴纯文本不受影响。
    const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const files = pickImagesFromClipboard(e.clipboardData);
      if (!files.length) return;
      if (imageInputBlocked) {
        message.warning(IMAGE_INPUT_BLOCKED_TIP);
        return;
      }
      e.preventDefault();
      void addImageFiles(files);
    }, [addImageFiles, imageInputBlocked]);

    const handleRemoveImage = useCallback((id: string) => {
      setSelectedImages?.(selectedImagesRef.current.filter((image) => image.id !== id));
    }, [setSelectedImages]);

    // ── Dropdown menus ──
    const handleUploadImageClick = useCallback(() => {
      if (imageInputBlocked) {
        message.warning(IMAGE_INPUT_BLOCKED_TIP);
        return;
      }
      imageInputRef.current?.click();
    }, [imageInputBlocked]);

    const plusMenuItems: MenuProps['items'] = [
      { key: 'upload-file', icon: <PaperClipOutlined />, label: '上传文件', onClick: () => handleUploadBtnClick() },
      { key: 'upload-image', icon: <PictureOutlined />, label: '上传图片', onClick: () => handleUploadImageClick() },
    ];

    const selectMode = (mode: ChatInputModeKey) => {
      setSelectedMode(getModeConfig(mode));
      onModeChange?.(mode);
      message.info(mode === 'report' ? '已切换到报告模式' : mode === 'explore' ? '已切换到探索模式' : '已切换到交互模式');
    };

    const modeMenuItems: MenuProps['items'] = (['interact', 'explore', 'report'] as ChatInputModeKey[]).map((key) => {
      const mode = getModeConfig(key);
      const isSelected = selectedMode.key === key;
      return {
        key,
        className: `mode-menu-item-wrap ${isSelected ? 'mode-menu-item--selected' : ''}`,
        label: (
          <div className="mode-menu-item">
            <span className="mode-menu-item-main">
              <span className="mode-menu-item-head">
                <span className="mode-menu-item-icon">{mode.icon}</span>
                <span className="mode-menu-item-name">{mode.label}</span>
              </span>
              <span className="mode-menu-item-desc">{mode.desc}</span>
            </span>
            {isSelected && <CheckOutlined className="mode-menu-item-check" />}
          </div>
        ),
        onClick: () => selectMode(key),
      };
    });

    const toggleSemGroup = (id: string) => {
      setExpandedSemGroups((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    /** 递归渲染语义节点（与大屏 AiChatPanel 同款：文件夹仅展开/收起、空分组灰色、仅叶子可选中） */
    const renderSemNode = (node: any, depth: number): React.ReactNode => {
      const indent = { paddingLeft: 8 + depth * 16 };
      // 叶子：数据语义，唯一可选中的节点
      if (node.type === 'schema') {
        const isSel = selectedData?.schemaId != null && selectedData.schemaId === node.schemaId;
        return (
          <div key={node.id} className={`sem-leaf ${isSel ? 'selected' : ''}`} style={indent} title={node.techName || node.name}
            onClick={() => { onSelectData?.({ name: node.name, schemaId: node.schemaId, groupName: node.groupName }); setSemDropdownOpen(false); }}
          >
            <FileTextOutlined className="sem-leaf-icon" />
            <span className="sem-leaf-name">{node.name}</span>
          </div>
        );
      }
      // 分组：不可选中，按有无子节点分为可展开文件夹 / 灰色空分组
      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length === 0) {
        return (
          <div key={node.id} className="sem-group-node is-empty" style={indent}>
            <FolderOutlined className="sem-group-icon sem-group-icon--empty" />
            <span className="sem-group-name">{node.name}</span>
          </div>
        );
      }
      const nodeId = String(node.id);
      const isExpanded = expandedSemGroups.has(nodeId);
      const childCount = typeof node.count === 'number' ? node.count : children.length;
      return (
        <div key={node.id} className="sem-group">
          <div className="sem-group-node" style={indent} onClick={() => toggleSemGroup(nodeId)}>
            {isExpanded
              ? <FolderOpenOutlined className="sem-group-icon" />
              : <FolderOutlined className="sem-group-icon" />}
            <span className="sem-group-name">{node.name}</span>
            {childCount > 0 && <span className="sem-group-count">{childCount}</span>}
            <span className={`sem-group-chevron ${isExpanded ? 'open' : ''}`}><RightOutlined /></span>
          </div>
          {isExpanded && children.map((child: any) => renderSemNode(child, depth + 1))}
        </div>
      );
    };

    /** 数据语义 Popover 内容（与大屏同款：分组文件夹 / 数据语义文件层级结构，无搜索）；助手会话仅展示绑定叶子 */
    const semTreeSource = assistantSemanticTree ?? semanticTree;
    const semanticPopoverContent = (
      <div className="sem-tree">
        {semLoading ? (
          <div className="sem-empty">加载中...</div>
        ) : semTreeSource.length === 0 ? (
          <div className="sem-empty">暂无数据语义</div>
        ) : (
          semTreeSource.map((node: any) => renderSemNode(node, 0))
        )}
      </div>
    );

    /** 技能飞层内容（统一黑色样式：顶部搜索 + 多选列表）；助手会话候选即绑定列表 */
    const skillSource = assistantSkills ?? skillList;
    const filteredSkillList = skillSource.filter((s: any) => matchKeyword(s.bizName ?? s.name, skillSearch));
    const skillPopoverContent = (
      <div className="uni-popup">
        <div className="uni-popup-search">
          <SearchOutlined />
          <input value={skillSearch} onChange={(e) => setSkillSearch(e.target.value)} placeholder="搜索技能" />
        </div>
        <div className="uni-popup-list">
          {skillLoading ? (
            <div className="uni-popup-empty">加载中...</div>
          ) : filteredSkillList.length === 0 ? (
            <div className="uni-popup-empty">{skillSearch.trim() ? '无匹配结果' : '暂无可用技能'}</div>
          ) : (
            filteredSkillList.map((s: any) => {
              const sid = String(s.id);
              const isSel = selectedSkills.has(sid);
              return (
                <div key={sid} className={`uni-popup-item ${isSel ? 'selected' : ''}`}
                  onClick={() => setSelectedSkills((prev) => { const n = new Set(prev); n.has(sid) ? n.delete(sid) : n.add(sid); return n; })}
                >
                  <ToolOutlined className="uni-icon" />
                  <span className="uni-name">{s.bizName}</span>
                  {s.status === 1 && <span className="skill-tag builtin">启用</span>}
                  {isSel && <CheckOutlined className="uni-check" />}
                </div>
              );
            })
          )}
        </div>
      </div>
    );

    /** MCP 分组 hover 飞层：该分组服务多选列表 */
    const renderMcpFlyout = (g: any) => {
      const gid = g.groupId;
      // 不在 Map 中即尚未加载完成（加载完成后即使空数组也会写入）
      if (!mcpGroupItems.has(gid)) {
        return <div className="uni-popup uni-popup--flyout"><div className="uni-popup-empty">加载中...</div></div>;
      }
      const all = mcpGroupItems.get(gid) || [];
      const items = matchKeyword(g.groupName, mcpSearch) ? all : all.filter((m: any) => matchKeyword(m.name, mcpSearch));
      return (
        <div className="uni-popup uni-popup--flyout">
          <div className="uni-popup-list">
            {items.length === 0 ? (
              <div className="uni-popup-empty">该分组下暂无 MCP 服务</div>
            ) : (
              items.map((m: any) => {
                const mid = String(m.id);
                const isSel = selectedMCPs.has(mid);
                return (
                  <div key={mid} className={`uni-popup-item ${isSel ? 'selected' : ''}`}
                    onClick={() => setSelectedMCPs((prev) => { const n = new Set(prev); n.has(mid) ? n.delete(mid) : n.add(mid); return n; })}
                  >
                    <ApiOutlined className="uni-icon" />
                    <span className="uni-name">{m.name ?? mid}</span>
                    {m.description && <span className="uni-desc">{m.description}</span>}
                    {isSel && <CheckOutlined className="uni-check" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      );
    };

    /** MCP 飞层内容（统一黑色样式：顶部搜索 + 分组 hover 右飞层）；助手会话为绑定服务的扁平列表 */
    const filteredBoundMcps = assistantMcps
      ? assistantMcps.filter((m) => matchKeyword(m.name, mcpSearch))
      : null;
    const filteredMcpGroups = mcpGroups.filter((g: any) =>
      matchKeyword(g.groupName, mcpSearch) || (mcpGroupItems.get(g.groupId) || []).some((m: any) => matchKeyword(m.name, mcpSearch)));
    const mcpPopoverContent = (
      <div className="uni-popup">
        <div className="uni-popup-search">
          <SearchOutlined />
          <input value={mcpSearch} onChange={(e) => setMcpSearch(e.target.value)} placeholder="搜索 MCP" />
        </div>
        <div className="uni-popup-list">
          {mcpLoading ? (
            <div className="uni-popup-empty">加载中...</div>
          ) : filteredBoundMcps ? (
            filteredBoundMcps.length === 0 ? (
              <div className="uni-popup-empty">{mcpSearch.trim() ? '无匹配结果' : '该助手未绑定 MCP'}</div>
            ) : (
              filteredBoundMcps.map((m) => {
                const mid = String(m.id);
                const isSel = selectedMCPs.has(mid);
                return (
                  <div key={mid} className={`uni-popup-item ${isSel ? 'selected' : ''}`}
                    onClick={() => setSelectedMCPs((prev) => { const n = new Set(prev); n.has(mid) ? n.delete(mid) : n.add(mid); return n; })}
                  >
                    <ApiOutlined className="uni-icon" />
                    <span className="uni-name">{m.name ?? mid}</span>
                    {isSel && <CheckOutlined className="uni-check" />}
                  </div>
                );
              })
            )
          ) : filteredMcpGroups.length === 0 ? (
            <div className="uni-popup-empty">{mcpSearch.trim() ? '无匹配结果' : '暂无 MCP 分组'}</div>
          ) : (
            filteredMcpGroups.map((g: any) => {
              const gid = g.groupId;
              const items = mcpGroupItems.get(gid) || [];
              return (
                <Popover
                  key={gid}
                  content={renderMcpFlyout(g)}
                  trigger="hover"
                  placement="rightTop"
                  arrow={false}
                  overlayClassName="uni-popover"
                  getPopupContainer={(node) => (node.closest('.ant-popover') as HTMLElement) || document.body}
                  onOpenChange={(open) => { if (open) loadMcpGroup(gid); }}
                >
                  <div className="uni-popup-item">
                    <FolderOutlined className="uni-icon" />
                    <span className="uni-name">{g.groupName}</span>
                    {items.length > 0 && <span className="uni-count">{items.length}</span>}
                    <RightOutlined className="uni-arrow" />
                  </div>
                </Popover>
              );
            })
          )}
        </div>
      </div>
    );

    /** 更多 Popover 完整内容（统一黑色样式；技能 / MCP hover 显示右侧子层） */
    const morePopoverContent = (
      <div className="uni-popup uni-popup--menu">
        <div className="uni-popup-list">
          {/* 查看语义 */}
          <div className="uni-popup-item" onClick={openSchemaModal}>
            <EyeOutlined className="uni-icon" />
            <span className="uni-name">查看语义</span>
          </div>
          {/* 交互模式下隐藏 技能 / MCP 入口 */}
          {selectedMode.key !== 'interact' && (
            <>
              <Popover
                content={skillPopoverContent}
                trigger="hover"
                placement="rightTop"
                arrow={false}
                overlayClassName="uni-popover"
                getPopupContainer={(node) => (node.closest('.ant-popover') as HTMLElement) || document.body}
                onOpenChange={(open) => { if (open) startSkillLoad(); }}
              >
                <div className="uni-popup-item">
                  <ToolOutlined className="uni-icon" />
                  <span className="uni-name">技能</span>
                  <RightOutlined className="uni-arrow" />
                </div>
              </Popover>
              <Popover
                content={mcpPopoverContent}
                trigger="hover"
                placement="rightTop"
                arrow={false}
                overlayClassName="uni-popover"
                getPopupContainer={(node) => (node.closest('.ant-popover') as HTMLElement) || document.body}
                onOpenChange={(open) => { if (open) startMcpLoad(); }}
              >
                <div className="uni-popup-item">
                  <ApiOutlined className="uni-icon" />
                  <span className="uni-name">MCP</span>
                  <RightOutlined className="uni-arrow" />
                </div>
              </Popover>
            </>
          )}
        </div>
      </div>
    );

    return (
      <div className="chat-input-glass">
        {/* Textarea area */}
        <div style={{ padding: '16px 18px 8px' }}>
          <Input.TextArea
            autoFocus
            id="input-textarea"
            disabled={loading}
            placeholder={
              loading ? '正在思考中,请稍后输入'
                : selectedMode.key === 'report' ? '请输入报告主题或分析诉求，系统将生成结构化报告'
                : deepThinkEnabled ? '深度思考模式已开启，请输入您的问题'
                  : '请输入问题，快速获取结果'
            }
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onCompositionStart={handleCompositionStart}
            onCompositionEnd={handleCompositionEnd}
            onPaste={handlePaste}
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ border: 'none', boxShadow: 'none', padding: '0', resize: 'none', backgroundColor: 'transparent', cursor: loading ? 'not-allowed' : 'text', fontSize: 13, color: 'var(--ink)', lineHeight: 1.5, fontFamily: 'var(--font)' }}
            styles={{ textarea: { border: 'none', boxShadow: 'none', backgroundColor: 'transparent' } }}
          />
        </div>

        {/* Selected Excel tag */}
        {selectedExcel?.file_id && selectedExcel?.file_name && (
          <div style={{ padding: '0 18px 6px' }}>
            <FileTag
              fileId={selectedExcel.file_id}
              fileName={selectedExcel.file_name}
              onClose={handleRemoveExcel}
              showDownloadIcon={false}
              backgroundColor="rgba(255,255,255,0.5)"
              textColor="var(--ink-2)"
              style={{
                backdropFilter: 'blur(8px)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--r-xs)',
              }}
            />
          </div>
        )}

        {/* Selected images preview */}
        {selectedImages && selectedImages.length > 0 && (
          <div style={{ padding: '0 18px 6px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {selectedImages.map((image) => (
              <div key={image.id} style={{ position: 'relative', width: 56, height: 56, borderRadius: 'var(--r-xs)', overflow: 'hidden', border: '1px solid var(--border)', background: 'rgba(255,255,255,0.5)' }}>
                <img src={image.dataUrl} alt={image.name} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                <button
                  type="button"
                  aria-label="移除图片"
                  onClick={() => handleRemoveImage(image.id)}
                  style={{ position: 'absolute', top: 2, right: 2, width: 16, height: 16, padding: 0, border: 'none', borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <CloseOutlined style={{ fontSize: 9 }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px 10px', gap: 6 }}>
          {/* + (upload dropdown) */}
          <Dropdown menu={{ items: plusMenuItems }} trigger={['click']} placement="topLeft">
            <button
              type="button"
              className="input-label-btn"
              title="更多操作"
              onFocus={() => void loadUploadDrawer()}
              onMouseEnter={() => void loadUploadDrawer()}
            >
              <PlusOutlined style={{ fontSize: 14 }} />
            </button>
          </Dropdown>

          {/* 数据语义选择 Popover（与大屏同款：分组树，仅叶子可选） */}
          <Popover content={semanticPopoverContent} trigger="click" placement="topLeft" arrow={false} overlayClassName="sem-tree-popover" open={semDropdownOpen}
            onOpenChange={setSemDropdownOpen}>
            <button type="button" className={`input-label-btn ${semDropdownOpen ? 'active' : ''}`} title="选择数据语义">
              <DatabaseOutlined style={{ fontSize: 14 }} />
              <span style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedData?.name || '数据语义'}
              </span>
              <DownOutlined style={{ fontSize: 9, transition: 'transform 0.2s', transform: semDropdownOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
          </Popover>

          {/* 交互 (mode switcher dropdown) */}
          <Dropdown menu={{ items: modeMenuItems }} trigger={['click']} placement="topLeft" overlayClassName="mode-menu-overlay">
            <button type="button" className="input-label-btn">
              {selectedMode.icon}
              <span>{selectedMode.label}</span>
              <DownOutlined className="btn-arrow" />
            </button>
          </Dropdown>

          {/* 思考 (deep think toggle) */}
          <button
            type="button"
            className={`input-label-btn ${thinkingActive ? 'active' : ''} ${thinkingReadOnly ? 'readonly' : ''}`}
            onClick={thinkingReadOnly ? undefined : onToggleDeepThink}
            disabled={thinkingReadOnly}
            title={thinkingReadOnly ? '当前模型不支持关闭思考' : (thinkingActive ? '关闭思考' : '开启思考')}
          >
            <BulbOutlined style={{ fontSize: 14 }} />
            <span>思考</span>
          </button>

          {/* 更多 (...) */}
          <Popover
            content={morePopoverContent}
            trigger="click"
            placement="topRight"
            open={morePopupOpen}
            onOpenChange={(open) => { setMorePopupOpen(open); if (!open) { setSkillSearch(''); setMcpSearch(''); } }}
            destroyTooltipOnHide
            overlayClassName="uni-popover"
          >
            <button type="button" className="input-label-btn" title="更多">
              <EllipsisOutlined style={{ fontSize: 16 }} />
            </button>
          </Popover>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Voice Input */}
          <AudioRecorder onTranscribed={handleTranscribed} disabled={loading} />

          {/* Send / Stop Button */}
          <button
            type="button"
            className="send-btn-glass"
            onClick={loading ? onStop : handleSend}
            style={loading ? { background: 'var(--danger)', boxShadow: '0 2px 8px rgba(239,68,68,0.3)' } : {}}
          >
            {loading ? <StopOutlined style={{ fontSize: 16 }} /> : <SendOutlined style={{ fontSize: 16 }} />}
          </button>
        </div>

        {/* 隐藏的图片选择 input，由「上传图片」菜单触发 */}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleImageInputChange}
        />

        {uploadFileVisible && (
          <RetryableLazy
            loader={loadUploadDrawer}
            componentProps={{ open: uploadFileVisible, conv, onOk: handleUploadOk, onClose: handleUploadClose }}
            fallback={<LazyFeatureFallback label="正在加载文件上传…" style={{ position: 'fixed', inset: '0 0 0 auto', zIndex: 1000, width: 520, minHeight: '100vh' }} />}
          />
        )}

        {/* 查看语义 Modal */}
        {semModalOpen && (
          <RetryableLazy
            loader={loadSchemaFieldsModal}
            componentProps={{ open: true, tables: semModalTables, onClose: () => setSemModalOpen(false) }}
            fallback={<LazyFeatureFallback label="正在加载数据语义…" />}
          />
        )}
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
