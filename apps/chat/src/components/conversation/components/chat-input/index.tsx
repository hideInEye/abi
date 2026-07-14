import { ApiOutlined, AudioOutlined, BulbOutlined, CompassOutlined, DownOutlined, EllipsisOutlined, EyeOutlined, FileTextOutlined, MessageOutlined, PaperClipOutlined, PictureOutlined, PlusOutlined, SearchOutlined, SendOutlined, StopOutlined, ThunderboltOutlined, DatabaseOutlined, EditOutlined, ToolOutlined } from '@ant-design/icons';
import { Dropdown, Input, message, Popover } from 'antd';
import type { MenuProps } from 'antd';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AudioRecorder from '../../../../components/AudioRecorder';
import UploadDrawer from '../../UploadDrawer';
import FileTag from '../../../../components/FileTag';
import { querySkillList } from '../../../../service/api/skill';
import { queryMcpList } from '../../../../service/api/mcp';
import { fetchSemanticGroups, fetchSemanticDetail } from '../../../../service/api/semantic';
import SchemaFieldsModal from '../../../conversation-analysis/SchemaFieldsModal';
import type { SchemaTable, SchemaField } from '../../../conversation-analysis/SchemaFieldsModal';
import { getSpaceId } from '../../../../utils';

export interface SemanticSelectedData {
  name: string
  schemaId?: number | string
  /** 数据语义所属分组名（不是对话分组） */
  groupName?: string
}

interface ChatInputProps {
  conv?: any;
  /** 确保存在可用会话（无会话时先创建），返回会话对象 */
  ensureConv?: () => Promise<any>;
  loading: boolean;
  onSend: (value: string) => void;
  onStop: () => void;
  deepThinkEnabled: boolean;
  uploadFileEnabled: boolean;
  onToggleDeepThink: () => void;
  onToggleUploadFile: () => void;
  setSelectedExcel?: (file: any) => void;
  selectedExcel?: any;
  spaceId?: number;
  // 数据语义 props
  semanticGroups?: any[];
  semanticGroupSchemas?: Map<string, any[]>;
  selectedData?: SemanticSelectedData | null;
  onSelectData?: (data: SemanticSelectedData) => void;
  semLoading?: boolean;
  expandedSemGroups?: Set<string>;
  onToggleSemGroup?: (groupId: string) => void;
  // 外部控制输入值
  externalValue?: string;
  onExternalValueConsumed?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = React.memo(
  ({ loading, onSend, onStop, deepThinkEnabled, uploadFileEnabled, setSelectedExcel, selectedExcel, conv, ensureConv, onToggleDeepThink, onToggleUploadFile,
    spaceId,
    semanticGroups = [], semanticGroupSchemas, selectedData, onSelectData, semLoading, expandedSemGroups, onToggleSemGroup,
    externalValue, onExternalValueConsumed
  }) => {
    const [value, setValue] = useState('');
    const isComposingRef = useRef(false);
    const [uploadFileVisible, setUploadFileVisible] = useState(false);
    const [semDropdownOpen, setSemDropdownOpen] = useState(false);
    const [morePopupOpen, setMorePopupOpen] = useState(false);
    const [skillPopOpen, setSkillPopOpen] = useState(false);
    const [mcpPopOpen, setMcpPopOpen] = useState(false);
    const [selectedMode, setSelectedMode] = useState<any>({ key: 'interact', label: '交互', icon: <MessageOutlined /> });

    // ── 技能状态 ──
    const [skillList, setSkillList] = useState<any[]>([]);
    const [skillLoading, setSkillLoading] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

    // ── MCP 状态 ──
    const [mcpGroups, setMcpGroups] = useState<any[]>([]);
    const [mcpGroupItems, setMcpGroupItems] = useState<Map<number, any[]>>(new Map());
    const [expandedMcpGroups, setExpandedMcpGroups] = useState<Set<number>>(new Set());
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

    // 懒加载技能列表
    useEffect(() => {
      if (!skillPopOpen || skillList.length > 0) return;
      setSkillLoading(true);
      querySkillList({ spaceId: spaceId || getSpaceId(), status: '1' })
        .then((res: any) => {
          const list = res?.data?.data?.pageItems || res?.data?.list || (Array.isArray(res?.data) ? res.data : []) || res?.rows || [];
          setSkillList(Array.isArray(list) ? list : []);
        })
        .catch(() => {})
        .finally(() => setSkillLoading(false));
    }, [skillPopOpen]);

    // 懒加载 MCP 分组
    useEffect(() => {
      if (!mcpPopOpen || mcpGroups.length > 0) return;
      setMcpLoading(true);
      fetchSemanticGroups({ groupType: 'mcp', pageNum: 1, pageSize: 100, spaceId: spaceId || getSpaceId() })
        .then((res: any) => {
          const list = res?.data?.data?.pageItems || res?.data || res?.rows || [];
          setMcpGroups(Array.isArray(list) ? list : []);
        })
        .catch(() => {})
        .finally(() => setMcpLoading(false));
    }, [mcpPopOpen]);

    // 展开 MCP 分组时懒加载服务列表
    const toggleMcpGroup = (groupId: number) => {
      setExpandedMcpGroups(prev => {
        const next = new Set(prev);
        if (next.has(groupId)) {
          next.delete(groupId);
        } else {
          next.add(groupId);
          if (!mcpGroupItems.has(groupId)) {
            queryMcpList({ pageNo: 1, pageSize: 100, namespaceId: `s_${groupId}` })
              .then((res: any) => {
                const list = res?.data?.data?.pageItems || res?.data?.records || res?.data?.list || (Array.isArray(res?.data) ? res.data : []);
                setMcpGroupItems(prev => new Map(prev).set(groupId, Array.isArray(list) ? list : []));
              })
              .catch(() => {});
          }
        }
        return next;
      });
    };

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
      onSend(value);
      setValue('');
    }, [loading, onSend, value]);

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

    const modeMenuItems: MenuProps['items'] = [
      { key: 'interact', icon: <MessageOutlined />, label: '交互', onClick: () => { setSelectedMode({ key: 'interact', label: '交互', icon: <MessageOutlined /> }); message.info('已切换到交互模式'); } },
      { key: 'explore', icon: <CompassOutlined />, label: '探索', onClick: () => { setSelectedMode({ key: 'explore', label: '探索', icon: <CompassOutlined /> }); message.info('已切换到探索模式'); } },
      { key: 'report', icon: <FileTextOutlined />, label: '报告', onClick: () => { setSelectedMode({ key: 'report', label: '报告', icon: <FileTextOutlined /> }); message.info('已切换到报告模式'); } },
    ];

    /** 数据语义 Popover 内容 */
    const semanticPopoverContent = (
      <div style={{ width: 260, maxHeight: 360, overflowY: 'auto' }}>
        {semLoading ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>加载中...</div>
        ) : semanticGroups.length === 0 ? (
          <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>暂无数据语义</div>
        ) : (
          semanticGroups.map((g: any) => {
            const gid = g.groupId;
            const isExpanded = expandedSemGroups?.has(gid);
            const schemas = semanticGroupSchemas?.get(gid) || [];
            return (
              <div key={gid}>
                <div
                  style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}
                  onClick={() => onToggleSemGroup?.(gid)}
                >
                  <DownOutlined style={{ fontSize: 9, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--ink-3)' }} />
                  <span style={{ fontWeight: 600, flex: 1 }}>{g.groupName}</span>
                  <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{schemas.length > 0 ? schemas.length : ''}</span>
                </div>
                {isExpanded && (
                  schemas.length === 0 ? (
                    <div style={{ padding: '8px 12px 8px 28px', fontSize: 12, color: 'var(--ink-3)' }}>暂无表数据</div>
                  ) : (
                    schemas.map((s: any) => (
                      <div key={s.schemaId} className="sem-option" style={{ padding: '7px 12px 7px 28px', fontSize: 12.5, cursor: 'pointer' }}
                        onClick={() => { onSelectData?.({ name: s.bizName, schemaId: s.schemaId, groupName: g.groupName }); setSemDropdownOpen(false); }}
                      >
                        <div style={{ fontWeight: 500 }}>{s.bizName}</div>
                        {s.techName && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.techName}</div>}
                      </div>
                    ))
                  )
                )}
              </div>
            );
          })
        )}
      </div>
    );

    /** 更多 Popover 完整内容 */
    const morePopoverContent = (
      <div style={{ width: 180, maxHeight: 380, overflow: 'visible' }}>
        {/* 查看语义 */}
        <div className="more-popup-item" onClick={openSchemaModal}>
          <EyeOutlined style={{ fontSize: 14 }} /> 查看语义
        </div>
        {/* 交互模式下隐藏 技能 / MCP 入口 */}
        {selectedMode.key !== 'interact' && (
        <>
        {/* 技能（嵌套 Popover） */}
        <Popover
          content={
            <div style={{ width: 280, maxHeight: 400, overflowY: 'auto' }}>
              <div className="popover-back-btn" onClick={() => setSkillPopOpen(false)}>
                <DownOutlined style={{ fontSize: 10, transform: 'rotate(90deg)' }} /> 返回
              </div>
              <div className="skill-popup-header">技能列表</div>
              {skillLoading ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>加载中...</div>
              ) : skillList.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>暂无可用技能</div>
              ) : (
                skillList.map((s: any) => {
                  const sid = String(s.id);
                  return (
                    <div key={sid} className={`skill-popup-item ${selectedSkills.has(sid) ? 'active' : ''}`}
                      onClick={() => setSelectedSkills((prev) => { const n = new Set(prev); n.has(sid) ? n.delete(sid) : n.add(sid); return n; })}
                    >
                      <ToolOutlined style={{ fontSize: 13 }} />
                      {s.bizName}
                      {s.status === 1 && <span className="skill-tag builtin">启用</span>}
                    </div>
                  );
                })
              )}
            </div>
          }
          trigger="click"
          placement="rightTop"
          open={skillPopOpen}
          onOpenChange={setSkillPopOpen}
          getPopupContainer={(triggerNode) => triggerNode as HTMLElement}
          overlayInnerStyle={{ padding: '4px 0' }}
        >
          <div className="more-popup-item" onClick={() => setSkillPopOpen(true)}>
            <ToolOutlined style={{ fontSize: 14 }} /> 技能
            <DownOutlined style={{ marginLeft: 'auto', fontSize: 10, transform: 'rotate(-90deg)' }} />
          </div>
        </Popover>
        {/* MCP（嵌套 Popover） */}
        <Popover
          content={
            <div style={{ width: 300, maxHeight: 400, overflowY: 'auto' }}>
              <div className="popover-back-btn" onClick={() => setMcpPopOpen(false)}>
                <DownOutlined style={{ fontSize: 10, transform: 'rotate(90deg)' }} /> 返回
              </div>
              {mcpLoading ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>加载中...</div>
              ) : mcpGroups.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>暂无 MCP 分组</div>
              ) : (
                mcpGroups.map((g: any) => {
                  const gid = g.groupId;
                  const isExpanded = expandedMcpGroups.has(gid);
                  const items = mcpGroupItems.get(gid) || [];
                  return (
                    <div key={gid}>
                      <div style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}
                        onClick={() => toggleMcpGroup(gid)}
                      >
                        <DownOutlined style={{ fontSize: 9, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)', color: 'var(--ink-3)' }} />
                        <span style={{ fontWeight: 600, flex: 1 }}>{g.groupName}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{items.length > 0 ? items.length : ''}</span>
                      </div>
                      {isExpanded && (
                        items.length === 0 ? (
                          <div style={{ padding: '8px 12px 8px 28px', fontSize: 12, color: 'var(--ink-3)' }}>该分组下暂无 MCP 服务</div>
                        ) : (
                          items.map((m: any) => {
                            const mid = String(m.id);
                            const mName = m.name ?? mid;
                            return (
                              <div key={mid} className={`mcp-option ${selectedMCPs.has(mid) ? 'selected' : ''}`} style={{ paddingLeft: 28 }}
                                onClick={() => setSelectedMCPs((prev) => { const n = new Set(prev); n.has(mid) ? n.delete(mid) : n.add(mid); return n; })}
                              >
                                <span className={`mcp-opt-dot ${selectedMCPs.has(mid) ? 'on' : 'off'}`} />
                                {mName}
                                {m.description && <span className="mcp-opt-desc">{m.description}</span>}
                              </div>
                            );
                          })
                        )
                      )}
                    </div>
                  );
                })
              )}
            </div>
          }
          trigger="click"
          placement="rightTop"
          open={mcpPopOpen}
          onOpenChange={setMcpPopOpen}
          getPopupContainer={(triggerNode) => triggerNode as HTMLElement}
          overlayInnerStyle={{ padding: '4px 0' }}
        >
          <div className="more-popup-item" onClick={() => setMcpPopOpen(true)}>
            <ApiOutlined style={{ fontSize: 14 }} /> MCP
            <DownOutlined style={{ marginLeft: 'auto', fontSize: 10, transform: 'rotate(-90deg)' }} />
          </div>
        </Popover>
        </>
        )}
        {/* 联网搜索 */}
        {/* <div className="more-popup-item" onClick={() => { setMorePopupOpen(false); message.info('联网搜索功能即将上线'); }}>
          <SearchOutlined style={{ fontSize: 14 }} /> 联网搜索
        </div> */}
        {/* 代码执行 */}
        {/* <div className="more-popup-item" onClick={() => { setMorePopupOpen(false); message.info('代码执行功能即将上线'); }}>
          <ToolOutlined style={{ fontSize: 14 }} /> 代码执行
        </div> */}
        {/* Markdown */}
        {/* <div className="more-popup-item" onClick={() => { setMorePopupOpen(false); message.info('Markdown功能即将上线'); }}>
          <EditOutlined style={{ fontSize: 14 }} /> Markdown
        </div> */}
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
          <Popover content={semanticPopoverContent} trigger="click" placement="topLeft" open={semDropdownOpen} onOpenChange={setSemDropdownOpen}>
            <button type="button" className={`input-label-btn ${semDropdownOpen ? 'active' : ''}`} title="选择数据">
              <DatabaseOutlined style={{ fontSize: 14 }} />
              <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedData?.name || '数据'}
              </span>
              <DownOutlined style={{ fontSize: 9, transition: 'transform 0.2s', transform: semDropdownOpen ? 'rotate(180deg)' : 'none' }} />
            </button>
          </Popover>

          {/* 交互 (mode switcher dropdown) */}
          <Dropdown menu={{ items: modeMenuItems }} trigger={['click']} placement="topLeft">
            <button type="button" className="input-label-btn">
              {selectedMode.icon}
              <span>{selectedMode.label}</span>
              <DownOutlined className="btn-arrow" />
            </button>
          </Dropdown>

          {/* 思考 (deep think toggle) */}
          <button type="button" className={`input-label-btn ${deepThinkEnabled ? 'active' : ''}`} onClick={onToggleDeepThink}>
            <BulbOutlined style={{ fontSize: 14 }} />
            <span>思考</span>
          </button>

          {/* 更多 (...) */}
          <Popover
            content={morePopoverContent}
            trigger="click"
            placement="topRight"
            open={morePopupOpen}
            onOpenChange={(open) => { setMorePopupOpen(open); if (!open) { setSkillPopOpen(false); setMcpPopOpen(false); } }}
            destroyTooltipOnHide
            overlayInnerStyle={{ padding: '4px 0', overflow: 'visible' }}
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
