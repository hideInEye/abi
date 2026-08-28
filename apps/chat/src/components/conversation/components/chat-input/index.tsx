import { ApiOutlined, BulbOutlined, CheckOutlined, CompassOutlined, DownOutlined, EllipsisOutlined, EyeOutlined, FileTextOutlined, FolderOutlined, MessageOutlined, PaperClipOutlined, PictureOutlined, PlusOutlined, RightOutlined, SearchOutlined, SendOutlined, StopOutlined, DatabaseOutlined, ToolOutlined } from '@ant-design/icons';
import { Dropdown, Input, message, Popover } from 'antd';
import type { MenuProps } from 'antd';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AudioRecorder from '../../../../components/AudioRecorder';
import UploadDrawer from '../../UploadDrawer';
import FileTag from '../../../../components/FileTag';
import { fetchFavoriteList } from '../../../../service/api/abi-system';
import { queryMcpList } from '../../../../service/api/mcp';
import type { ReportSourceVersionFields } from '../../../../service/api/report';
import { fetchSemanticGroups, fetchSemanticDetail } from '../../../../service/api/semantic';
import SchemaFieldsModal from '../../../conversation-analysis/SchemaFieldsModal';
import type { SchemaTable, SchemaField } from '../../../conversation-analysis/SchemaFieldsModal';
import { getSpaceId } from '../../../../utils';
import type { ModelOption } from '../chat-header';
import { buildReportSourceVersionFields } from './reportSourceSelection';
import { hasSelectedConversationData } from './sendValidation';
import { filterSemanticTree, matchKeyword } from './popupFilter';

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
  /** 仅探索模式提交使用，透传所选技能/MCP 版本 id。 */
  skillSourceVersionIds?: string[]
  mcpSourceVersionIds?: string[]
}

type ChatInputMode = {
  key: ChatInputModeKey
  label: string
  desc: string
  icon: React.ReactNode
}

interface ChatInputProps {
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
  assistantMcps?: ReadonlyArray<{ id: string; name: string; protocol: 'sse' | 'streamable' }> | null;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(
  ({ loading, onSend, onStop, deepThinkEnabled, setSelectedExcel, selectedExcel, conv, ensureConv, onToggleDeepThink, onToggleUploadFile,
    currentModel,
    spaceId,
      selectedModeKey, onModeChange,
    semanticTree = [], selectedData, onSelectData, semLoading,
    externalValue, onExternalValueConsumed,
    assistantSemanticTree, assistantSkills, assistantMcps
  }) => {
    // 当前模型是否支持关闭思考：1 为支持，0 或其他为不支持
    const isSupportCloseThinking = currentModel?.isSupportThinking === 1 || currentModel?.isSupportThinking === '1';
    // 模型存在且不支持关闭思考时，思考按钮为只读并强制点亮
    const thinkingReadOnly = !!currentModel && !isSupportCloseThinking;
    const thinkingActive = thinkingReadOnly || deepThinkEnabled;
    const [value, setValue] = useState('');
    const isComposingRef = useRef(false);
    const [uploadFileVisible, setUploadFileVisible] = useState(false);
    const [semDropdownOpen, setSemDropdownOpen] = useState(false);
    const [morePopupOpen, setMorePopupOpen] = useState(false);
    // ── 统一弹窗搜索关键词（数据语义 / 技能 / MCP）──
    const [semSearch, setSemSearch] = useState('');
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

    // 切换助手会话（绑定候选引用变化）时清空已选技能 / MCP，避免携带旧助手资源发送。
    useEffect(() => {
      setSelectedSkills(new Set());
      setSelectedMCPs(new Set());
    }, [assistantSkills, assistantMcps]);

    useEffect(() => {
      // 父容器控制当前模式，输入框只负责展示和把发送 mode 上抛。
      if (!selectedModeKey || selectedModeKey === selectedMode.key) return;
      setSelectedMode(getModeConfig(selectedModeKey));
    }, [getModeConfig, selectedMode.key, selectedModeKey]);

    // 懒加载技能列表（首次 hover 进入技能面板时触发一次）；助手会话直接用绑定候选，不请求全局收藏。
    const skillLoadStartedRef = useRef(false);
    const startSkillLoad = useCallback(() => {
      if (assistantSkills || skillLoadStartedRef.current) return;
      skillLoadStartedRef.current = true;
      setSkillLoading(true);
      // 弹窗只认收藏列表：与技能商店「我的技能」同一套逻辑，仅调 favorite/list（favorType=skill）
      fetchFavoriteList({ favorType: 'skill' })
        .then((res: any) => {
          const rows = res?.rows ?? res?.data?.rows ?? res?.data?.list ?? (Array.isArray(res?.data) ? res.data : []);
          const list = Array.isArray(rows) ? rows : [];
          // 保留行原始字段（latestVersionId/skillType 等提交要用），id/名称做兼容映射
          setSkillList(list.map((r: any) => ({
            ...r,
            id: r.favorId ?? r.favor_id ?? r.skillId ?? r.id,
            bizName: r.bizName ?? r.skillName ?? r.name ?? '',
          })));
        })
        .catch(() => {})
        .finally(() => setSkillLoading(false));
    }, [assistantSkills]);

    // 懒加载 MCP 分组（首次 hover 进入 MCP 面板时触发一次）；助手会话直接用绑定候选，不请求全局分组。
    const mcpLoadStartedRef = useRef(false);
    const startMcpLoad = useCallback(() => {
      if (assistantMcps || mcpLoadStartedRef.current) return;
      mcpLoadStartedRef.current = true;
      setMcpLoading(true);
      fetchSemanticGroups({ groupType: 'mcp', pageNum: 1, pageSize: 100, spaceId: spaceId || getSpaceId() })
        .then((res: any) => {
          const list = res?.data?.data?.pageItems || res?.data || res?.rows || [];
          setMcpGroups(Array.isArray(list) ? list : []);
        })
        .catch(() => {})
        .finally(() => setMcpLoading(false));
    }, [spaceId, assistantMcps]);

    // hover MCP 分组时懒加载服务列表（防重入）
    const mcpLoadingGroupsRef = useRef<Set<number>>(new Set());
    const loadMcpGroup = useCallback((groupId: number) => {
      if (mcpGroupItems.has(groupId) || mcpLoadingGroupsRef.current.has(groupId)) return;
      mcpLoadingGroupsRef.current.add(groupId);
      queryMcpList({ pageNo: 1, pageSize: 100, namespaceId: `s_${groupId}` })
        .then((res: any) => {
          const list = res?.data?.data?.pageItems || res?.data?.records || res?.data?.list || (Array.isArray(res?.data) ? res.data : []);
          setMcpGroupItems(prev => new Map(prev).set(groupId, Array.isArray(list) ? list : []));
        })
        .catch(() => {})
        .finally(() => mcpLoadingGroupsRef.current.delete(groupId));
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
              // 助手会话：候选即绑定列表（id 即源版本 id），报告源字段映射规则不变。
              skills: (assistantSkills ?? skillList) as any[],
              selectedSkillIds: selectedSkills,
              mcps: (assistantMcps ?? Array.from(mcpGroupItems.values()).flat()) as any[],
              selectedMcpIds: selectedMCPs,
            }),
          }
        : selectedMode.key === 'explore'
          ? {
              mode: selectedMode.key,
              skillSourceVersionIds: Array.from(selectedSkills),
              mcpSourceVersionIds: Array.from(selectedMCPs),
            }
          : { mode: selectedMode.key };

      onSend(value, options);
      setValue('');
    }, [assistantMcps, assistantSkills, loading, mcpGroupItems, onSend, selectedData, selectedExcel, selectedMCPs, selectedMode.key, selectedSkills, skillList, value]);

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

    // ── Dropdown menus ──
    const plusMenuItems: MenuProps['items'] = [
      { key: 'upload-file', icon: <PaperClipOutlined />, label: '上传文件', onClick: () => handleUploadBtnClick() },
      { key: 'upload-image', icon: <PictureOutlined />, label: '上传图片', onClick: () => message.info('图片上传功能即将上线') },
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

    /** 递归渲染语义节点：叶子点击选中；分组点击选中、hover 右侧弹出子层 */
    const renderSemNode = (node: any): React.ReactNode => {
      // 叶子：数据语义，点击选中并关闭下拉
      if (node.type === 'schema') {
        const isSel = selectedData?.schemaId != null && selectedData.schemaId === node.schemaId;
        return (
          <div key={node.id} className={`uni-popup-item ${isSel ? 'selected' : ''}`} title={node.techName || node.name}
            onClick={() => { onSelectData?.({ name: node.name, schemaId: node.schemaId, groupName: node.groupName }); setSemDropdownOpen(false); }}
          >
            <FileTextOutlined className="uni-icon" />
            <span className="uni-name">{node.name}</span>
            {isSel && <CheckOutlined className="uni-check" />}
          </div>
        );
      }
      // 分组：可选中（发送真实 group_id，与 semantic_id 互斥）；节点 id 形如 g_<真实分组id>，去掉 g_ 前缀即为真实分组 id（超长数字，保持字符串避免精度丢失）
      const children = Array.isArray(node.children) ? node.children : [];
      const groupId = String(node.id).replace(/^g_/, '');
      const isSelGroup = selectedData?.groupId != null && String(selectedData.groupId) === groupId;
      const selectGroup = () => onSelectData?.({ name: node.name, groupId, groupName: node.name });
      // 空分组（无子节点）同样可选中，点击直接选中该分组
      if (children.length === 0) {
        return (
          <div key={node.id} className={`uni-popup-item ${isSelGroup ? 'selected' : ''}`} onClick={selectGroup}>
            <FolderOutlined className="uni-icon uni-icon--empty" />
            <span className="uni-name">{node.name}</span>
            {isSelGroup && <CheckOutlined className="uni-check" />}
          </div>
        );
      }
      const childCount = typeof node.count === 'number' ? node.count : children.length;
      return (
        <Popover
          key={node.id}
          content={<div className="uni-popup uni-popup--flyout"><div className="uni-popup-list">{children.map((child: any) => renderSemNode(child))}</div></div>}
          trigger="hover"
          placement="rightTop"
          arrow={false}
          overlayClassName="uni-popover"
          getPopupContainer={(node) => (node.closest('.ant-popover') as HTMLElement) || document.body}
        >
          <div className={`uni-popup-item ${isSelGroup ? 'selected' : ''}`} onClick={selectGroup}>
            <FolderOutlined className="uni-icon" />
            <span className="uni-name">{node.name}</span>
            {childCount > 0 && <span className="uni-count">{childCount}</span>}
            <RightOutlined className="uni-arrow" />
          </div>
        </Popover>
      );
    };

    /** 数据语义 Popover 内容（统一黑色样式：顶部搜索 + 分组 hover 右飞层）；助手会话仅展示绑定叶子 */
    const semTreeSource = assistantSemanticTree ?? semanticTree;
    const filteredSemTree = useMemo(() => filterSemanticTree(semTreeSource, semSearch), [semTreeSource, semSearch]);
    const semanticPopoverContent = (
      <div className="uni-popup">
        <div className="uni-popup-search">
          <SearchOutlined />
          <input value={semSearch} onChange={(e) => setSemSearch(e.target.value)} placeholder="搜索数据语义" />
        </div>
        <div className="uni-popup-list">
          {semLoading ? (
            <div className="uni-popup-empty">加载中...</div>
          ) : filteredSemTree.length === 0 ? (
            <div className="uni-popup-empty">{semSearch.trim() ? '无匹配结果' : '暂无数据语义'}</div>
          ) : (
            filteredSemTree.map((node: any) => renderSemNode(node))
          )}
        </div>
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

        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 10px 10px', gap: 6 }}>
          {/* + (upload dropdown) */}
          <Dropdown menu={{ items: plusMenuItems }} trigger={['click']} placement="topLeft">
            <button type="button" className="input-label-btn" title="更多操作">
              <PlusOutlined style={{ fontSize: 14 }} />
            </button>
          </Dropdown>

          {/* 数据选择 Popover */}
          <Popover content={semanticPopoverContent} trigger="click" placement="topLeft" arrow={false} overlayClassName="uni-popover" open={semDropdownOpen}
            onOpenChange={(open) => { setSemDropdownOpen(open); if (!open) setSemSearch(''); }}>
            <button type="button" className={`input-label-btn ${semDropdownOpen ? 'active' : ''}`} title="选择数据">
              <DatabaseOutlined style={{ fontSize: 14 }} />
              <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedData?.name || '数据'}
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

        <UploadDrawer open={uploadFileVisible} conv={conv} onOk={handleUploadOk} onClose={handleUploadClose} />

        {/* 查看语义 Modal */}
        <SchemaFieldsModal open={semModalOpen} tables={semModalTables} onClose={() => setSemModalOpen(false)} />
      </div>
    );
  }
);

ChatInput.displayName = 'ChatInput';

export default ChatInput;
