import {
  AudioOutlined,
  BulbOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  DownOutlined,
  EditOutlined,
  EllipsisOutlined,
  EyeOutlined,
  MessageOutlined,
  PlusOutlined,
  SearchOutlined,
  SendOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { Dropdown, Input, message, Popover } from 'antd'
import type { MenuProps } from 'antd'
import React, { useEffect, useRef, useState } from 'react'
import { createApp } from '../../service/api/app'
import { querySkillList } from '../../service/api/skill'
import { queryMcpList } from '../../service/api/mcp'
import { fetchSemanticGroups, fetchSemanticSchemas, fetchSemanticDetail } from '../../service/api/semantic'
import { fetchModelList } from '../../service/api/abi-system'
import SchemaFieldsModal from './SchemaFieldsModal'
import type { SchemaTable, SchemaField } from './SchemaFieldsModal'
import { getSpaceId } from '../../utils'

interface ModelOption {
  id: string | number
  key: string
  label: string
  desc: string
}

const DEFAULT_MODEL: ModelOption = { id: '0', key: 'qwen3.7-max', label: 'Qwen3.7-Max', desc: '通义千问旗舰，多模态推理' }

const INTERACT_MODES = [
  { key: 'chat', label: '交互', desc: '对话式问答与分析' },
  { key: 'explore', label: '探索', desc: '数据探索与洞察发现' },
  { key: 'report', label: '报告', desc: '自动生成分析报告' },
]

interface SkillItem {
  id: string | number
  bizName: string
  summary?: string
  status?: number | string
}

const examples = [
  {
    key: 'sales',
    icon: '📊',
    title: '沃尔玛销售数据分析',
    desc: '分析沃尔玛近一年的销售数据...',
    color: 'blue',
  },
  {
    key: 'profile',
    icon: '🗂️',
    title: '数据库画像与分析报告',
    desc: '基于用户行为数据，生成用户...',
    color: 'green',
  },
  {
    key: 'finance',
    icon: '📈',
    title: '金融财报深度分析',
    desc: '解读上市公司年度财报，进行...',
    color: 'purple',
  },
  {
    key: 'predict',
    icon: '🔧',
    title: '电商销售预测分析',
    desc: '基于历史数据预测未来三个月...',
    color: 'orange',
  },
]

interface NewChatWelcomeProps {
  curApp?: any
  spaceId?: number
  onConvCreated?: (app: any, question: string) => void
}

const NewChatWelcome: React.FC<NewChatWelcomeProps> = ({ curApp, spaceId, onConvCreated }) => {
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([DEFAULT_MODEL])
  const [selectedModel, setSelectedModel] = useState<ModelOption>(DEFAULT_MODEL)
  const [value, setValue] = useState('')
  const [deepThinkEnabled, setDeepThinkEnabled] = useState(false)
  const [selectedData, setSelectedData] = useState<{ name: string; schemaId?: number | string } | null>(null)
  const [interactMode, setInteractMode] = useState(INTERACT_MODES[0])
  const [uploadPopupOpen, setUploadPopupOpen] = useState(false)
  const [modePopupOpen, setModePopupOpen] = useState(false)
  const [morePopupOpen, setMorePopupOpen] = useState(false)
  const [skillPopOpen, setSkillPopOpen] = useState(false)
  const [mcpPopOpen, setMcpPopOpen] = useState(false)
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [selectedMCPs, setSelectedMCPs] = useState<Set<string>>(new Set())
  const [semDropdownOpen, setSemDropdownOpen] = useState(false)

  // API 数据状态
  const [skillList, setSkillList] = useState<SkillItem[]>([])
  const [mcpGroups, setMcpGroups] = useState<any[]>([])
  const [mcpGroupItems, setMcpGroupItems] = useState<Map<number, any[]>>(new Map())
  const [expandedMcpGroups, setExpandedMcpGroups] = useState<Set<number>>(new Set())
  const [semanticGroups, setSemanticGroups] = useState<any[]>([])
  const [semanticGroupSchemas, setSemanticGroupSchemas] = useState<Map<number, any[]>>(new Map())
  const [expandedSemGroups, setExpandedSemGroups] = useState<Set<number>>(new Set())
  const [skillLoading, setSkillLoading] = useState(false)
  const [mcpLoading, setMcpLoading] = useState(false)
  const [semLoading, setSemLoading] = useState(false)

  // 字段弹窗状态
  const [semModalOpen, setSemModalOpen] = useState(false)
  const [semModalTables, setSemModalTables] = useState<SchemaTable[]>([])

  // 创建中状态
  const [creating, setCreating] = useState(false)

  // 加载大模型列表
  useEffect(() => {
    fetchModelList({ spaceId: spaceId || getSpaceId() }).then((res: any) => {
      const list = res?.data?.data || res?.data || []
      if (Array.isArray(list) && list.length > 0) {
        const options: ModelOption[] = list.map((item: any) => ({
          id: item.modelId ?? item.id ?? item.llmId ?? '',
          key: item.modelName || item.model_name || item.llmModel || item.key || '',
          label: item.modelName || item.model_name || item.llmModel || item.label || '',
          desc: item.remark || item.description || item.desc || '',
        }))
        setModelOptions(options)
        setSelectedModel(options[0])
      }
    }).catch(() => {
      // 接口失败使用默认模型
    })
  }, [])

  // 加载技能列表
  useEffect(() => {
    if (!skillPopOpen || skillList.length > 0) return
    setSkillLoading(true)
    querySkillList({ spaceId: spaceId || getSpaceId(), status: '1' })
      .then((res: any) => {
        const list = res?.data?.data?.pageItems || res?.data?.list || (Array.isArray(res?.data) ? res.data : []) || res?.rows || []
        setSkillList(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => setSkillLoading(false))
  }, [skillPopOpen])

  // 加载 MCP 分组列表
  useEffect(() => {
    if (!mcpPopOpen || mcpGroups.length > 0) return
    setMcpLoading(true)
    fetchSemanticGroups({ groupType: 'mcp', pageNum: 1, pageSize: 100, spaceId: spaceId || getSpaceId() })
      .then((res: any) => {
        const list = res?.data?.data?.pageItems || res?.data || res?.rows || []
        setMcpGroups(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => setMcpLoading(false))
  }, [mcpPopOpen])

  // 展开 MCP 分组时懒加载该分组的服务列表
  const toggleMcpGroup = (groupId: number) => {
    setExpandedMcpGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
        // 懒加载：未缓存才请求
        if (!mcpGroupItems.has(groupId)) {
          queryMcpList({ pageNo: 1, pageSize: 100, namespaceId: `s_${groupId}` })
            .then((res: any) => {
              const list = res?.data?.data?.pageItems || res?.data?.records || res?.data?.list || (Array.isArray(res?.data) ? res.data : [])
              setMcpGroupItems(prev => new Map(prev).set(groupId, Array.isArray(list) ? list : []))
            })
            .catch(() => {})
        }
      }
      return next
    })
  }

  // 加载数据语义分组
  useEffect(() => {
    if (!semDropdownOpen || semanticGroups.length > 0) return
    setSemLoading(true)
    fetchSemanticGroups({ groupType: 'shema', pageNum: 1, pageSize: 100, spaceId: spaceId || getSpaceId() })
      .then((res: any) => {
        const list = res?.data || res?.rows || []
        setSemanticGroups(Array.isArray(list) ? list : [])
      })
      .catch(() => {})
      .finally(() => setSemLoading(false))
  }, [semDropdownOpen])

  // 展开语义分组时懒加载该分组的表列表
  const toggleSemGroup = (groupId: number) => {
    setExpandedSemGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupId)) {
        next.delete(groupId)
      } else {
        next.add(groupId)
        // 懒加载：未缓存才请求
        if (!semanticGroupSchemas.has(groupId)) {
          fetchSemanticSchemas({ groupId, pageNum: 1, pageSize: 100 })
            .then((res: any) => {
              const list = res?.data || res?.rows || []
              setSemanticGroupSchemas(prev => new Map(prev).set(groupId, Array.isArray(list) ? list : []))
            })
            .catch(() => {})
        }
      }
      return next
    })
  }

  // 解析 modelDetail 提取字段（对应编辑第二步「字段语义配置」展示的字段，按表分组）
  function parseFieldsFromModelDetail(modelDetailStr: string): SchemaField[] {
    try {
      const detail = typeof modelDetailStr === 'string' ? JSON.parse(modelDetailStr) : modelDetailStr
      const fields: SchemaField[] = []
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
          })
        })
      }
      // 主键
      addFields(detail.identifiers, 'pk', '主键')
      // 维度：modelDetail 中 datetime 和 categorical 都在 dimensions 数组里
      const dimensions = detail.dimensions || []
      addFields(dimensions.filter((d: any) => d.type === 'datetime'), 'date', '日期')
      addFields(dimensions.filter((d: any) => d.type !== 'datetime'), 'dim', '维度')
      // 度量
      addFields(detail.measures, 'metric', '指标')
      return fields
    } catch { return [] }
  }

  // “查看语义”：只加载当前选中的表的字段
  const openSchemaModalAll = () => {
    setMorePopupOpen(false)
    if (!selectedData?.schemaId) { message.info('请先选择数据语义表'); return }
    const table: SchemaTable = {
      schemaId: selectedData.schemaId,
      bizName: selectedData.name,
      fields: [],
      loading: true,
    }
    setSemModalTables([table])
    setSemModalOpen(true)
    fetchSemanticDetail(selectedData.schemaId)
      .then((res: any) => {
        const detail = res?.data?.data || res?.data || res
        const modelDetail = detail?.modelDetail
        const fields = modelDetail ? parseFieldsFromModelDetail(modelDetail) : []
        setSemModalTables([{
          ...table,
          fields,
          loading: false,
          description: detail?.description || detail?.remark || '',
        }])
      })
      .catch(() => setSemModalTables([{ ...table, loading: false }]))
  }

  const modelMenuItems: MenuProps['items'] = modelOptions.map((model) => ({
    key: String(model.id),
    label: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>{model.label}</span>
        <span style={{ fontSize: 11, color: '#888', fontWeight: 400 }}>{model.desc}</span>
      </div>
    ),
    onClick: () => {
      setSelectedModel(model)
      message.info(`已切换到 ${model.label}`)
    },
  }))

  const handleSend = async () => {
    if (!value.trim() || creating) return
    if (interactMode.key !== 'chat') {
      message.info(`${interactMode.label}模式功能即将上线`)
      return
    }

    const question = value.trim()
    setCreating(true)

    try {
      // 创建会话
      const appRes: any = await createApp({ space_id: spaceId || getSpaceId() })
      const rawApp = appRes?.data ?? appRes
      const app = {
        ...rawApp,
        chat_id: rawApp?.chat_id ?? rawApp?.sessionId ?? rawApp?.session_id ?? rawApp?.chatId,
        space_id: rawApp?.space_id ?? rawApp?.spaceId,
        app_code: rawApp?.app_code ?? rawApp?.appCode,
        agent_id: rawApp?.agent_id ?? rawApp?.agentId,
        conv_uid: rawApp?.conv_uid ?? rawApp?.convUid,
      }
      if (!app.chat_id) {
        console.error('createApp response:', appRes)
        message.error('创建会话失败')
        setCreating(false)
        return
      }

      setValue('')
      onConvCreated?.(app, question)
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        message.error(err?.message || '创建会话失败')
      }
      setCreating(false)
    }
  }

  return (
    <div className="h-full w-full flex flex-col overflow-hidden" style={{ background: 'transparent' }}>
      {/* Top header */}
      <header className="chat-header shrink-0">
        <div className="chat-header-left">
          <Dropdown menu={{ items: modelMenuItems }} trigger={['click']} placement="bottomLeft">
            <button type="button" className="model-switcher-btn">
              <span className="model-dot" />
              <span className="model-name">{selectedModel.label}</span>
              <DownOutlined className="model-arrow" />
            </button>
          </Dropdown>
        </div>
        <div className="chat-header-right">
          <button
            type="button"
            className="header-schedule-btn"
            title="定时任务"
            onClick={() => message.info('定时任务功能即将上线')}
          >
            <ClockCircleOutlined style={{ fontSize: 15 }} />
            <span>定时任务</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <div className="welcome-view flex-1 min-h-0 overflow-y-auto">
        <div className="welcome-logo">
          <span style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>A</span>
        </div>
        <div className="welcome-title">TrustABI · 芯智</div>
        <p className="welcome-subtitle">
          您的全能数据智能专家。从智能问数到归因预测，再到一键生成报告，芯智助您高效挖掘数据价值，精准获取商业洞察。
        </p>

        <div className="welcome-section-title">推荐示例</div>
        <div className="welcome-cases-grid">
          {examples.map((item) => (
            <div key={item.key} className={`welcome-case-card ${item.color}`}>
              <div className="case-icon">{item.icon}</div>
              <div className="case-content">
                <div className="case-title">{item.title}</div>
                <div className="case-desc">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input area */}
      <div className="input-area">
          <div className="input-inner">
            <div className="input-box">
              <div style={{ padding: '16px 18px 8px' }}>
                <Input.TextArea
                  autoFocus
                  placeholder="输入你的问题，支持数据查询、智能分析..."
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoSize={{ minRows: 1, maxRows: 4 }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                  style={{
                    border: 'none', boxShadow: 'none', padding: '0', resize: 'none',
                    backgroundColor: 'transparent', fontSize: 14, color: 'var(--ink)',
                    lineHeight: 1.5, fontFamily: 'var(--font)',
                  }}
                  styles={{ textarea: { border: 'none', boxShadow: 'none', backgroundColor: 'transparent' } }}
                />
              </div>

              <div className="input-toolbar">
                {/* 1. + Upload */}
                <Popover
                  content={
                    <div style={{ minWidth: 120 }}>
                      <div className="upload-popup-item" onClick={() => { setUploadPopupOpen(false); message.info('上传文件功能即将上线') }}>
                        <PlusOutlined /> 上传文件
                      </div>
                      <div className="upload-popup-item" onClick={() => { setUploadPopupOpen(false); message.info('上传图片功能即将上线') }}>
                        <PlusOutlined /> 上传图片
                      </div>
                    </div>
                  }
                  trigger="click"
                  placement="topLeft"
                  open={uploadPopupOpen}
                  onOpenChange={setUploadPopupOpen}
                >
                  <button type="button" className="input-tool" title="添加">
                    <PlusOutlined style={{ fontSize: 16 }} />
                  </button>
                </Popover>

                {/* 2. Data Semantic Dropdown */}
                <Popover
                  content={
                    <div style={{ width: 260, maxHeight: 360, overflowY: 'auto' }}>
                      {semLoading ? (
                        <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>加载中...</div>
                      ) : semanticGroups.length === 0 ? (
                        <div style={{ padding: 16, textAlign: 'center', color: 'var(--ink-3)', fontSize: 12 }}>暂无数据语义</div>
                      ) : (
                        semanticGroups.map((g: any) => {
                          const gid = g.groupId
                          const isExpanded = expandedSemGroups.has(gid)
                          const schemas = semanticGroupSchemas.get(gid) || []
                          return (
                            <div key={gid}>
                              <div
                                style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={() => toggleSemGroup(gid)}
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
                                    <div
                                      key={s.schemaId}
                                      className="sem-option"
                                      style={{ padding: '7px 12px 7px 28px', fontSize: 12.5, cursor: 'pointer' }}
                                      onClick={() => { setSelectedData({ name: s.bizName, schemaId: s.schemaId }); setSemDropdownOpen(false) }}
                                    >
                                      <div style={{ fontWeight: 500 }}>{s.bizName}</div>
                                      {s.techName && <div style={{ fontSize: 11, color: 'var(--ink-3)' }}>{s.techName}</div>}
                                    </div>
                                  ))
                                )
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  }
                  trigger="click"
                  placement="topLeft"
                  open={semDropdownOpen}
                  onOpenChange={setSemDropdownOpen}
                >
                  <button type="button" className={`data-switcher ${semDropdownOpen ? 'open' : ''}`}>
                    <DatabaseOutlined style={{ fontSize: 13 }} />
                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {selectedData?.name || '数据'}
                    </span>
                    <DownOutlined style={{ fontSize: 10, transition: 'transform 0.2s', transform: semDropdownOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>
                </Popover>

                {/* 3. Mode Switch */}
                <Popover
                  content={
                    <div style={{ minWidth: 120 }}>
                      {INTERACT_MODES.map((mode) => (
                        <div
                          key={mode.key}
                          className={`mode-popup-item ${interactMode.key === mode.key ? 'active' : ''}`}
                          onClick={() => { setInteractMode(mode); setModePopupOpen(false); message.info(`已切换到${mode.label}模式`) }}
                        >
                          <MessageOutlined style={{ fontSize: 13 }} />
                          {mode.label}
                        </div>
                      ))}
                    </div>
                  }
                  trigger="click"
                  placement="top"
                  open={modePopupOpen}
                  onOpenChange={setModePopupOpen}
                >
                  <button type="button" className={`mode-switcher ${modePopupOpen ? 'open' : ''}`}>
                    <MessageOutlined style={{ fontSize: 13 }} />
                    <span>{interactMode.label}</span>
                    <DownOutlined style={{ fontSize: 10, transition: 'transform 0.2s', transform: modePopupOpen ? 'rotate(180deg)' : 'none' }} />
                  </button>
                </Popover>

                {/* 4. Thinking */}
                <button
                  type="button"
                  className={`input-tool ${deepThinkEnabled ? 'active' : ''}`}
                  onClick={() => setDeepThinkEnabled((v) => !v)}
                >
                  <BulbOutlined style={{ fontSize: 14 }} />
                  <span className="tool-label">思考</span>
                </button>

                {/* 5. More Menu */}
                <Popover
                  content={
                    <div style={{ width: 260, maxHeight: 380, overflow: 'visible' }}>
                      <div className="more-popup-item" onClick={openSchemaModalAll}>
                        <EyeOutlined style={{ fontSize: 14 }} /> 查看语义
                      </div>
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
                              skillList.map((s) => {
                                const sid = String(s.id)
                                return (
                                  <div
                                    key={sid}
                                    className={`skill-popup-item ${selectedSkills.has(sid) ? 'active' : ''}`}
                                    onClick={() => setSelectedSkills((prev) => { const n = new Set(prev); n.has(sid) ? n.delete(sid) : n.add(sid); return n })}
                                  >
                                    <ToolOutlined style={{ fontSize: 13 }} />
                                    {s.bizName}
                                    {s.status === 1 && <span className="skill-tag builtin">启用</span>}
                                  </div>
                                )
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
                                const gid = g.groupId
                                const isExpanded = expandedMcpGroups.has(gid)
                                const items = mcpGroupItems.get(gid) || []
                                return (
                                  <div key={gid}>
                                    <div
                                      style={{ padding: '9px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}
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
                                          const mid = String(m.id)
                                          const mName = m.name ?? mid
                                          return (
                                            <div
                                              key={mid}
                                              className={`mcp-option ${selectedMCPs.has(mid) ? 'selected' : ''}`}
                                              style={{ paddingLeft: 28 }}
                                              onClick={() => setSelectedMCPs((prev) => { const n = new Set(prev); n.has(mid) ? n.delete(mid) : n.add(mid); return n })}
                                            >
                                              <span className={`mcp-opt-dot ${selectedMCPs.has(mid) ? 'on' : 'off'}`} />
                                              {mName}
                                              {m.description && <span className="mcp-opt-desc">{m.description}</span>}
                                            </div>
                                          )
                                        })
                                      )
                                    )}
                                  </div>
                                )
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
                          <EllipsisOutlined style={{ fontSize: 14, transform: 'rotate(90deg)' }} /> MCP
                          <DownOutlined style={{ marginLeft: 'auto', fontSize: 10, transform: 'rotate(-90deg)' }} />
                        </div>
                      </Popover>
                      <div className="more-popup-item" onClick={() => { setMorePopupOpen(false); message.info('联网搜索功能即将上线') }}>
                        <SearchOutlined style={{ fontSize: 14 }} /> 联网搜索
                      </div>
                      <div className="more-popup-item" onClick={() => { setMorePopupOpen(false); message.info('代码执行功能即将上线') }}>
                        <ToolOutlined style={{ fontSize: 14 }} /> 代码执行
                      </div>
                      <div className="more-popup-item" onClick={() => { setMorePopupOpen(false); message.info('Markdown功能即将上线') }}>
                        <EditOutlined style={{ fontSize: 14 }} /> Markdown
                      </div>
                    </div>
                  }
                  trigger="click"
                  placement="topRight"
                  open={morePopupOpen}
                  onOpenChange={(open) => { setMorePopupOpen(open); if (!open) { setSkillPopOpen(false); setMcpPopOpen(false) } }}
                  destroyTooltipOnHide
                  overlayInnerStyle={{ padding: '4px 0', overflow: 'visible' }}
                >
                  <button type="button" className="input-tool" title="更多">
                    <EllipsisOutlined style={{ fontSize: 16 }} />
                  </button>
                </Popover>

                <div className="input-spacer" />

                {/* Microphone */}
                <button type="button" className="input-tool" title="语音输入" onClick={() => message.info('语音输入功能即将上线')}>
                  <AudioOutlined style={{ fontSize: 16 }} />
                </button>

                {/* Send */}
                <button type="button" className="send-btn" onClick={handleSend} disabled={creating} style={creating ? { opacity: 0.5, cursor: 'not-allowed' } : {}}>
                  <SendOutlined style={{ fontSize: 16 }} />
                </button>
              </div>
            </div>
          </div>
        </div>

      {/* Footer */}
      <div className="chat-footer">内容由 AI 生成，请注意甄别</div>

      {/* 数据语义字段弹窗 */}
      <SchemaFieldsModal
        open={semModalOpen}
        tables={semModalTables}
        onClose={() => setSemModalOpen(false)}
      />
    </div>
  )
}

export default NewChatWelcome
