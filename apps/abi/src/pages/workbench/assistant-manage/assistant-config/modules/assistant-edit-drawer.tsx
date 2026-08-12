import {
  ArrowLeftOutlined,
  BookOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  EditOutlined,
  ExperimentOutlined,
  FolderOutlined,
  LockOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  SecurityScanOutlined,
  SendOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Button, Input, Modal, Radio, Spin, Switch, Tag, message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { useEffect, useMemo, useState } from 'react'

import { addAppApi, updateAppApi, fetchAppDetailApi } from '@/service/api/abi-chat-app'
import { fetchModelList } from '@/service/api'
import { getSpaceId } from '@/store/slice/app'
import { useAppSelector } from '@/hooks/business/useStore'
import ToolPickerDrawer from './tool-picker-drawer'
import CapabilityPickerDrawer from './capability-picker-drawer'
import ModelPickerDrawer from './model-picker-drawer'
import { semanticPickerTabs, skillPickerTabs } from './capability-picker-configs'
import React from 'react'

/**
 * 助手新增/编辑 - 全屏 Drawer
 * 左（助手画像）/ 中（基础配置 / 知识 / 能力）/ 右（调试预览）
 */

interface Props {
  visible?: boolean
  agent?: AgentMock | null
  groupId?: string
  onClose: (refresh?: boolean) => void
}

export interface AgentMock {
  id: string | number
  name: string
  iconBg?: string
  iconLetter?: string
  description?: string
  prompt?: string
  groupId?: string
  /** status: '0'草稿 | '1'发布 | '2'下线 */
  status?: '0' | '1' | '2'
}

/// 折叠面板分组
type SectionKey = 'model' | 'opening' | 'questions' | 'semantic' | 'mcp' | 'skill'

const AssistantEditDrawer: React.FC<Props> = ({ visible = false, agent, groupId: propsGroupId, onClose }) => {
  const spaceId = useAppSelector(getSpaceId)
  const isEdit = !!agent?.id
  const [name, setName] = useState<string>('')
  const [editingName, setEditingName] = useState(false)
  const [prompt, setPrompt] = useState<string>(agent?.prompt || '')
  const [description, setDescription] = useState<string>(agent?.description || '')
  // status: '0'草稿 '1'发布 '2'下线
  const [status, setStatus] = useState<'0' | '1' | '2'>(agent?.status || '0')
  // 调试模式 enable_debug: '0'禁用 '1'启用
  const [enableDebug, setEnableDebug] = useState(false)
  // 公开访问 public_access: '0'关闭(私密) '1'开启(空间可见)
  const [publicAccess, setPublicAccess] = useState<'0' | '1'>('1')
  const [visibilityModalOpen, setVisibilityModalOpen] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [saving, setSaving] = useState(false)
  // rec_query 推荐问题列表
  const [recQuestions, setRecQuestions] = useState<string[]>([])
  const [recDrawerOpen, setRecDrawerOpen] = useState(false)
  // 抽屉内文本域草稿（每行一条，确认后生效）
  const [recDraft, setRecDraft] = useState('')

  // ── AI模型配置 单选（存 chatModelId）；嵌入模型固定默认 6（embedModelId）──
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set())
  const [modelPickerOpen, setModelPickerOpen] = useState(false)

  /** AI模型单选：选中即替换，再次点击同项则取消 */
  const handleModelSingleSelect = (id: string, checked: boolean) => {
    setSelectedModelIds(checked ? new Set([id]) : new Set())
  }

  // ── 开场引导 prologue ──
  const [prologue, setPrologue] = useState('')
  const [prologueModalOpen, setPrologueModalOpen] = useState(false)
  const [prologueDraft, setPrologueDraft] = useState('')

  /** 打开推荐问题抽屉：用当前列表预填草稿 */
  const openRecDrawer = () => {
    setRecDraft(recQuestions.join('\n'))
    setRecDrawerOpen(true)
  }

  /** 确认：按行解析为推荐问题列表 */
  const handleRecConfirm = () => {
    const lines = recDraft
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
    setRecQuestions(lines)
    setRecDrawerOpen(false)
  }

  // ── 工具选择 ──

  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set())
  const [toolPickerOpen, setToolPickerOpen] = useState(false)

  // ── 数据语义 / 技能 选中集合（暂不随保存提交，待后端字段确认）──
  const [selectedSemanticIds, setSelectedSemanticIds] = useState<Set<string>>(new Set())
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [semanticPickerOpen, setSemanticPickerOpen] = useState(false)
  const [skillPickerOpen, setSkillPickerOpen] = useState(false)

  // id -> 名称映射（各选择抽屉加载列表后回填；id 均带业务前缀不会冲突），用于折叠行下方展示已选项名称
  const [optionNameMap, setOptionNameMap] = useState<Record<string, string>>({})
  // id -> 分组层级路径（形如「父组 / 子组」），用于已选项行标注所属分组并展示层级
  const [optionGroupMap, setOptionGroupMap] = useState<Record<string, string>>({})
  // MCP 工具协议分组元数据：id -> { mcpSse, mcpStreamable }，值为真实 groupId 列表
  // sse 入 mcpSse，streamableHttp 入 mcpStreamable；保存时写入 toolConfig 的 mcp_sse/mcp_streamable
  const [toolMcpMetaMap, setToolMcpMetaMap] = useState<Record<string, { mcpSse: string[]; mcpStreamable: string[] }>>({})
  const mergeOptionNames = (options: { id: string; name: string; groupPath?: string; groupId?: string; frontProtocol?: string }[]) => {
    setOptionNameMap((prev) => {
      const next = { ...prev }
      options.forEach((o) => {
        next[o.id] = o.name
      })
      return next
    })
    setOptionGroupMap((prev) => {
      const next = { ...prev }
      options.forEach((o) => {
        if (o.groupPath) next[o.id] = o.groupPath
      })
      return next
    })
    // MCP 工具：按协议把真实 groupId 归入 sse / streamable（选择器加载时已带出 groupId 与 frontProtocol）
    setToolMcpMetaMap((prev) => {
      const next = { ...prev }
      options.forEach((o) => {
        if (o.id.startsWith('mcp_') && o.groupId) {
          const isSse = String(o.frontProtocol || '').toLowerCase() === 'sse'
          next[o.id] = isSse ? { mcpSse: [o.groupId], mcpStreamable: [] } : { mcpSse: [], mcpStreamable: [o.groupId] }
        }
      })
      return next
    })
  }

  /** 加载助手详情 */
  async function loadDetail() {
    if (!agent?.id) return
    setLoadingDetail(true)
    try {
      const res: any = await fetchAppDetailApi({ appId: agent.id })
      const detail = res?.data || {}
      // 配置字段嵌在 versions 里：取与 latestVersionId 匹配的版本，降级取第一个，再降级取顶层
      const versions: any[] = Array.isArray(detail.versions) ? detail.versions : []
      const version: any = versions.find((v: any) => String(v.versionId) === String(detail.latestVersionId)) || versions[0] || detail
      setName(detail.appName || agent.name || '')
      setPrompt(version.appPrompt || detail.appPrompt || '')
      setDescription(detail.description || '')
      setStatus(detail.status || '0')
      setEnableDebug(detail.enableDebug === '1')
      setPublicAccess(detail.publicAccess === '1' ? '1' : '0')
      setPrologue(version.prologue || '')
      // 推荐问题
      if (Array.isArray(version.recQuery)) {
        setRecQuestions(version.recQuery)
      }
      // 工具选中回显（同时从 config 里取 name 合入名称映射）
      if (Array.isArray(version.tools) && version.tools.length > 0) {
        const ids = new Set<string>()
        const names: { id: string; name: string; groupPath?: string }[] = []
        // MCP 工具协议分组回显：详情接口原样返回 mcp_sse/mcp_streamable，直接保留
        const mcpMeta: Record<string, { mcpSse: string[]; mcpStreamable: string[] }> = {}
        version.tools.forEach((t: any) => {
          const prefix = t.toolType === '2' ? 'mcp' : 'builtin'
          if (Array.isArray(t.toolConfig)) {
            t.toolConfig.forEach((c: any) => {
              if (c.id != null) {
                const fid = `${prefix}_${c.id}`
                ids.add(fid)
                if (c.name) names.push({ id: fid, name: c.name, groupPath: c.groupPath })
                if (prefix === 'mcp') {
                  mcpMeta[fid] = {
                    mcpSse: Array.isArray(c.mcp_sse) ? c.mcp_sse.map(String) : [],
                    mcpStreamable: Array.isArray(c.mcp_streamable) ? c.mcp_streamable.map(String) : [],
                  }
                }
              }
            })
          }
        })
        setSelectedToolIds(ids)
        if (names.length) mergeOptionNames(names)
        if (Object.keys(mcpMeta).length) setToolMcpMetaMap((prev) => ({ ...prev, ...mcpMeta }))
      }
      // 数据语义选中回显：schemaSemantics -> schema_<id>（合入 name）
      if (Array.isArray(version.schemaSemantics) && version.schemaSemantics.length > 0) {
        const ids = new Set<string>()
        const names: { id: string; name: string; groupPath?: string }[] = []
        version.schemaSemantics.forEach((s: any) => {
          const cfg = Array.isArray(s.schemaConfig) ? s.schemaConfig : []
          cfg.forEach((c: any) => {
            if (c.id != null) {
              const fid = `schema_${c.id}`
              ids.add(fid)
              if (c.name) names.push({ id: fid, name: c.name, groupPath: c.groupPath })
            }
          })
        })
        setSelectedSemanticIds(ids)
        if (names.length) mergeOptionNames(names)
      }
      // 技能选中回显：skills -> skill_<id>（合入 name）
      if (Array.isArray(version.skills) && version.skills.length > 0) {
        const ids = new Set<string>()
        const names: { id: string; name: string; groupPath?: string }[] = []
        version.skills.forEach((s: any) => {
          const cfg = Array.isArray(s.skillConfig) ? s.skillConfig : []
          cfg.forEach((c: any) => {
            if (c.id != null) {
              const fid = `skill_${c.id}`
              ids.add(fid)
              if (c.name) names.push({ id: fid, name: c.name, groupPath: c.groupPath })
            }
          })
        })
        setSelectedSkillIds(ids)
        if (names.length) mergeOptionNames(names)
      }
      // AI模型（单选）回显：chatModelId -> model_<id>，并解析模型名用于展示
      if (version.chatModelId != null && String(version.chatModelId) !== '') {
        const mid = `model_${version.chatModelId}`
        setSelectedModelIds(new Set([mid]))
        try {
          const modelRes: any = await fetchModelList({ pageNum: 1, pageSize: 999, spaceId: Number(spaceId) })
          const rows: any[] = modelRes?.data?.data ?? []
          const hit = rows.find((m: any) => String(m.modelId ?? m.llmId) === String(version.chatModelId))
          if (hit) mergeOptionNames([{ id: mid, name: hit.modelName || '-' }])
        } catch {
          // 忽略名称解析失败，仍展示 id
        }
      }
    } catch {
      // 降级：从列表 prop 读取基本信息
      setName(agent.name || '')
      setDescription(agent.description || '')
      setStatus(agent.status || '0')
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    if (visible && agent?.id) {
      loadDetail()
    } else if (visible && !agent?.id) {
      // 新增模式：重置表单
      setName('')
      setPrompt('')
      setDescription('')
      setStatus('0')
      setEnableDebug(false)
      setPublicAccess('1')
      setRecQuestions([])
      setSelectedToolIds(new Set())
      setToolMcpMetaMap({})
      setSelectedSemanticIds(new Set())
      setSelectedSkillIds(new Set())
      setSelectedModelIds(new Set())
      setPrologue('')
    }
  }, [visible, agent])

  /** 构建提交数据 */
  function buildPayload(overrideStatus?: string) {
    const toolConfigs = Array.from(selectedToolIds).map((id, index) => {
      const [group, ...rest] = id.split('_')
      const toolId = rest.join('_')
      const isMcp = group === 'mcp'
      // 带上 name 与 groupPath（JSON 原样存取），回显无需再拉列表即可展示名称与所属分组
      const config: Record<string, any> = { type: 'tool', id: Number(toolId) || toolId, name: optionNameMap[id], groupPath: optionGroupMap[id] }
      // MCP 工具额外存协议分组：mcp_sse / mcp_streamable，值为真实 groupId 列表
      if (isMcp) {
        const meta = toolMcpMetaMap[id]
        config.mcp_sse = meta?.mcpSse ?? []
        config.mcp_streamable = meta?.mcpStreamable ?? []
      }
      return {
        toolType: isMcp ? '2' : '1',
        toolConfig: [config],
        sort: index,
      }
    })
    // 数据语义：schema_<id> → { schemaConfig: [{type:'schema', id, name}], sort }
    const schemaSemantics = Array.from(selectedSemanticIds).map((id, index) => {
      const schemaId = id.replace('schema_', '')
      return { schemaConfig: [{ type: 'schema', id: Number(schemaId) || schemaId, name: optionNameMap[id], groupPath: optionGroupMap[id] }], sort: index }
    })
    // 技能：skill_<id> → { skillConfig: [{type:'skill', id, name}], sort }
    const skills = Array.from(selectedSkillIds).map((id, index) => {
      const skillId = id.replace('skill_', '')
      return { skillConfig: [{ type: 'skill', id: Number(skillId) || skillId, name: optionNameMap[id], groupPath: optionGroupMap[id] }], sort: index }
    })
    // AI模型单选：取唯一选中项，model_<id> 反解为 chatModelId
    const modelIdRaw = Array.from(selectedModelIds)[0]
    const chatModelId = modelIdRaw ? Number(String(modelIdRaw).replace('model_', '')) : undefined
    const payload: any = {
      // 名称必填：保存/上线前已通过 validateRequired 校验非空
      appName: name.trim(),
      spaceId,
      groupId: String(isEdit ? (agent?.groupId ?? '0') : (propsGroupId ?? '0')),
      description,
      appPrompt: prompt,
      prologue,
      recQuery: recQuestions,
      status: overrideStatus ?? status,
      enableDebug: enableDebug ? '1' : '0',
      publicAccess,
      tools: toolConfigs,
      schemaSemantics,
      skills,
      // 模型：对话模型单选（未选则不传）；嵌入模型固定默认 6
      chatModelId,
      embedModelId: 6,
    }
    if (isEdit && agent?.id) {
      payload.appId = agent.id
    }
    return payload
  }

  /** 保存/上线前校验必填项：助手名称、AI模型、数据语义 */
  const validateRequired = (): boolean => {
    if (!name.trim()) {
      message.warning('请输入助手名称')
      setEditingName(true)
      return false
    }
    if (selectedModelIds.size === 0) {
      message.warning('请配置AI模型')
      setOpenMap((p) => ({ ...p, model: true }))
      return false
    }
    if (selectedSemanticIds.size === 0) {
      message.warning('请添加数据语义')
      setOpenMap((p) => ({ ...p, semantic: true }))
      return false
    }
    return true
  }

  /** 保存：状态设为草稿 */
  const handleSave = async () => {
    if (saving) return
    if (!validateRequired()) return
    setSaving(true)
    try {
      const payload = buildPayload('0')
      // apiRequest 为扁平请求，失败时不会抛错而是返回 { error }，需显式判断
      const { error } = isEdit ? await updateAppApi(payload) : await addAppApi(payload)
      // 失败时全局错误处理已提示后端具体信息（如“应用名称不能为空”），保留抽屉不关闭
      if (error) return
      setStatus('0')
      message.success('已保存为草稿')
      onClose(true)
    } finally {
      setSaving(false)
    }
  }

  /** 上线：状态设为发布 */
  const handlePublish = async () => {
    if (saving) return
    if (!validateRequired()) return
    setSaving(true)
    try {
      const payload = buildPayload('1')
      const { error } = isEdit ? await updateAppApi(payload) : await addAppApi(payload)
      if (error) return
      setStatus('1')
      message.success('已上线，状态设为发布')
      onClose(true)
    } finally {
      setSaving(false)
    }
  }

  function handleToolCheck(id: string, checked: boolean) {
    setSelectedToolIds((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  }
  function handleBatchToolCheck(ids: string[], checked: boolean) {
    setSelectedToolIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)))
      return next
    })
  }

  /** 生成选中集合的单选/批量回调（数据语义/技能共用） */
  const makeToggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (id: string, checked: boolean) =>
    setter((prev) => {
      const next = new Set(prev)
      checked ? next.add(id) : next.delete(id)
      return next
    })
  const makeBatchToggle = (setter: React.Dispatch<React.SetStateAction<Set<string>>>) => (ids: string[], checked: boolean) =>
    setter((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => (checked ? next.add(id) : next.delete(id)))
      return next
    })

  const selectedToolCount = selectedToolIds.size

  /** 打开工具选择抽屉 */
  const openToolPicker = () => {
    setToolPickerOpen(true)
  }

  const [openMap, setOpenMap] = useState<Record<SectionKey, boolean>>({
    model: false,
    opening: false,
    questions: false,
    semantic: false,
    mcp: false,
    skill: false,
  })

  const toggle = (key: SectionKey) => setOpenMap((p) => ({ ...p, [key]: !p[key] }))

  const headerIcon = useMemo(
    () => (
      <div
        style={{
          alignItems: 'center',
          background: 'linear-gradient(135deg, #fa8c16 0%, #fa541c 100%)',
          borderRadius: 8,
          color: '#fff',
          display: 'flex',
          fontSize: 14,
          fontWeight: 700,
          height: 28,
          justifyContent: 'center',
          width: 28,
          boxShadow: '0 2px 8px rgba(250, 140, 22, 0.3)',
        }}
      >
        =
      </div>
    ),
    [],
  )

  return (
    <CommonDrawer
      open={visible}
      destroyOnClose
      closable={false}
      placement="right"
      width="100%"
      bodyStyle={{
        background: 'linear-gradient(135deg, rgba(240, 244, 255, 0.6) 0%, rgba(239, 243, 255, 0.6) 50%, rgba(239, 242, 255, 0.6) 100%)',
        padding: 0,
      }}
      headerStyle={{ display: 'none' }}
      onClose={() => onClose(false)}
    >
      <Spin spinning={loadingDetail}>
        {/* 顶部栏 */}
        <div
          style={{
            alignItems: 'center',
            background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 255, 0.95) 100%)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid rgba(130, 140, 200, 0.15)',
            display: 'flex',
            height: 60,
            padding: '0 20px',
            boxShadow: '0 2px 12px rgba(91, 124, 247, 0.08)',
          }}
        >
          <Button
            icon={<ArrowLeftOutlined />}
            type="text"
            onClick={() => onClose(false)}
            style={{
              borderRadius: 8,
              transition: 'all 0.3s ease',
            }}
          />
          <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginLeft: 10 }}>
            {headerIcon}
            {editingName ? (
              <Input
                autoFocus
                size="small"
                placeholder="请输入助手名称"
                style={{
                  width: 200,
                  borderRadius: 8,
                  border: '1px solid rgba(130, 140, 200, 0.2)',
                }}
                value={name}
                onBlur={() => setEditingName(false)}
                onChange={(e) => setName(e.target.value)}
                onPressEnter={() => setEditingName(false)}
              />
            ) : (
              <>
                {/* 名称为空时展示占位文案，后跟编辑按钮 */}
                <span style={{ fontSize: 16, fontWeight: 600, color: name ? '#1a2744' : '#8fa0b5' }}>{name || '编辑助手名称'}</span>
                <EditOutlined style={{ color: '#5b7cf7', cursor: 'pointer', fontSize: 17, transition: 'all 0.2s ease' }} onClick={() => setEditingName(true)} />
              </>
            )}
          </div>
          <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginLeft: 'auto' }}>
            <Button
              loading={saving}
              onClick={handleSave}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(130, 140, 200, 0.2)',
                fontWeight: 500,
                transition: 'all 0.3s ease',
              }}
            >
              保存
            </Button>
            <Button
              loading={saving}
              type="primary"
              onClick={handlePublish}
              style={{
                background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 4px 12px rgba(91, 124, 247, 0.3)',
                fontWeight: 600,
                transition: 'all 0.3s ease',
              }}
            >
              上线
            </Button>
          </div>
        </div>

        {/* 三栏主体 */}
        <div
          style={{
            display: 'grid',
            gap: 0,
            gridTemplateColumns: '1fr 1fr 1fr',
            height: 'calc(100vh - 60px)',
          }}
        >
          {/* 左：助手画像 */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(248, 250, 255, 0.6) 100%)',
              backdropFilter: 'blur(8px)',
              borderRight: '1px solid rgba(130, 140, 200, 0.12)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SectionHeader title="助手配置" />
            <div style={{ padding: '14px 18px 0' }}>
              <div style={{ alignItems: 'center', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600, color: '#3e5068' }}>助手画像</span>
                <Button
                  icon={<ThunderboltOutlined />}
                  size="small"
                  style={{
                    color: '#5b7cf7',
                    fontWeight: 500,
                  }}
                  type="link"
                >
                  自动优化
                </Button>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', padding: '10px 18px 18px' }}>
              <Input.TextArea
                bordered={false}
                style={{
                  height: '100%',
                  resize: 'none',
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
                placeholder={`请输入您的专属AI角色设定提示词。建议包含：身份背景、性格语气、专业领域及输出要求。设定越清晰，AI的回答越精准。\n\n一键套用模板：角色：[资深数据分析师] + 语气：[客观严谨/通俗易懂] + 任务：[生成Q3财报解读] + 格式：[Markdown/要点列表]。\n\n参考示例：你现在是一位拥有10年经验的资深商业数据分析师，性格严谨客观，擅长从复杂数据中挖掘业务洞察。请基于我提供的原始数据，输出一份结构清晰的月度销售数据报告。要求：必须包含核心指标摘要、数据可视化建议、异常波动归因分析，以及3条可落地的业务优化策略。语言风格需保持专业、精炼，杜绝主观臆断。`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </div>

          {/* 中：基础配置 / 知识 / 能力 */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.75) 0%, rgba(248, 250, 255, 0.7) 50%, rgba(246, 247, 255, 0.65) 100%)',
              backdropFilter: 'blur(12px)',
              borderRight: '1px solid rgba(130, 140, 200, 0.15)',
              overflow: 'auto',
              position: 'relative',
            }}
          >
            <GroupTitle title="基础配置" color="#5b7cf7" icon={<SettingOutlined />} />
            {/* AI模型配置：+ 号弹模型选择抽屉，点行/箭头展开下方已选列表 */}
            <CollapseRow
              extra={
                <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                  {selectedModelIds.size > 0 && <span style={{ color: '#8fa0b5', fontSize: 12 }}>已选 {selectedModelIds.size} 项</span>}
                  <PlusOutlined style={{ color: '#5b7cf7' }} onClick={() => setModelPickerOpen(true)} />
                </span>
              }
              open={openMap.model}
              title="AI模型配置"
              onToggle={() => toggle('model')}
            >
              <SelectedItemList emptyText="暂未添加模型" groupMap={optionGroupMap} ids={selectedModelIds} nameMap={optionNameMap} />
            </CollapseRow>
            {/* 开场引导：+ 号弹编辑弹窗，点行/箭头展开下方引导语 */}
            <CollapseRow
              extra={
                <PlusOutlined
                  style={{ color: '#5b7cf7' }}
                  onClick={() => {
                    setPrologueDraft(prologue)
                    setPrologueModalOpen(true)
                  }}
                />
              }
              open={openMap.opening}
              title="开场引导"
              onToggle={() => toggle('opening')}
            >
              {prologue ? (
                <div style={{ color: '#3e5068', fontSize: 13, lineHeight: 1.6, padding: '6px 24px', whiteSpace: 'pre-wrap' }}>{prologue}</div>
              ) : (
                <div style={{ color: '#8fa0b5', fontSize: 13, padding: '8px 24px' }}>暂未设置开场引导</div>
              )}
            </CollapseRow>

            <GroupTitle title="知识语义" color="#10b981" icon={<BookOutlined />} />
            {/* 数据语义：+ 号弹选择抽屉，点行/箭头展开下方已选列表 */}
            <CollapseRow
              extra={
                <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                  {selectedSemanticIds.size > 0 && <span style={{ color: '#8fa0b5', fontSize: 12 }}>已选 {selectedSemanticIds.size} 项</span>}
                  <PlusOutlined style={{ color: '#5b7cf7' }} onClick={() => setSemanticPickerOpen(true)} />
                </span>
              }
              open={openMap.semantic}
              title="数据语义"
              onToggle={() => toggle('semantic')}
            >
              <SelectedItemList emptyText="暂未添加数据语义" groupMap={optionGroupMap} ids={selectedSemanticIds} nameMap={optionNameMap} />
            </CollapseRow>

            <GroupTitle title="扩展能力" color="#f59e0b" icon={<ThunderboltOutlined />} />
            {/* 工具：+ 号弹工具选择抽屉，点行/箭头展开下方已选列表（按 MCP工具 / 内置工具 分组区分） */}
            <CollapseRow
              extra={
                <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                  {selectedToolCount > 0 && <span style={{ color: '#8fa0b5', fontSize: 12 }}>已选 {selectedToolCount} 项</span>}
                  <PlusOutlined style={{ color: '#5b7cf7' }} onClick={openToolPicker} />
                </span>
              }
              open={openMap.mcp}
              title="工具"
              onToggle={() => toggle('mcp')}
            >
              <SelectedToolList emptyText="暂未添加工具" groupMap={optionGroupMap} ids={selectedToolIds} nameMap={optionNameMap} />
            </CollapseRow>

            <CollapseRow
              extra={
                <span style={{ alignItems: 'center', display: 'flex', gap: 8 }}>
                  {selectedSkillIds.size > 0 && <span style={{ color: '#8fa0b5', fontSize: 12 }}>已选 {selectedSkillIds.size} 项</span>}
                  <QuestionCircleOutlined style={{ color: '#8fa0b5' }} />
                  <PlusOutlined style={{ color: '#5b7cf7' }} onClick={() => setSkillPickerOpen(true)} />
                </span>
              }
              open={openMap.skill}
              title="技能"
              titleExtra={<QuestionCircleOutlined style={{ color: '#8fa0b5', marginLeft: 4 }} />}
              onToggle={() => toggle('skill')}
            >
              <SelectedItemList emptyText="暂未添加技能" groupMap={optionGroupMap} ids={selectedSkillIds} nameMap={optionNameMap} />
            </CollapseRow>

            {/* 推荐问题 */}
            <CollapseRow
              extra={
                <PlusOutlined
                  style={{ color: '#5b7cf7' }}
                  onClick={(e) => {
                    e.stopPropagation()
                    openRecDrawer()
                  }}
                />
              }
              open={openMap.questions}
              title="示例"
              onToggle={() => toggle('questions')}
            >
              {recQuestions.length === 0 ? (
                <div style={{ color: '#8fa0b5', fontSize: 13, padding: '8px 24px' }}>暂无推荐问题</div>
              ) : (
                recQuestions.slice(0, 3).map((q, i) => (
                  <div key={i} style={{ color: '#3e5068', fontSize: 13, padding: '6px 24px', lineHeight: 1.6 }}>
                    {i + 1}. {q}
                  </div>
                ))
              )}
              {recQuestions.length > 3 && (
                <div style={{ color: '#5b7cf7', cursor: 'pointer', fontSize: 12, padding: '6px 24px', fontWeight: 500 }} onClick={openRecDrawer}>
                  查看全部 {recQuestions.length} 条
                </div>
              )}
            </CollapseRow>

            {/* 开启调试模式 */}
            <div
              style={{
                alignItems: 'center',
                borderTop: '1px solid rgba(130, 140, 200, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '18px 24px',
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.04) 0%, rgba(139, 92, 246, 0.02) 100%)',
                gap: 12,
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 16,
                    boxShadow: '0 4px 12px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <ExperimentOutlined />
                </div>
                <span style={{ color: '#1a2744', fontSize: 15, fontWeight: 500, letterSpacing: '0.03em' }}>开启调试模式</span>
              </div>
              <Switch checked={enableDebug} onChange={setEnableDebug} />
            </div>

            {/* 访问权限 */}
            <div
              style={{
                alignItems: 'center',
                borderTop: '1px solid rgba(130, 140, 200, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                padding: '18px 24px',
                background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.04) 0%, rgba(236, 72, 153, 0.02) 100%)',
                gap: 12,
                boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: 'linear-gradient(135deg, #ec4899 0%, #f472b6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontSize: 16,
                    boxShadow: '0 4px 12px rgba(236, 72, 153, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                    flexShrink: 0,
                  }}
                >
                  <SecurityScanOutlined />
                </div>
                <span style={{ color: '#1a2744', fontSize: 15, fontWeight: 500, letterSpacing: '0.03em' }}>访问权限</span>
              </div>
              <Switch checked={publicAccess === '1'} onChange={(checked) => setPublicAccess(checked ? '1' : '0')} checkedChildren="空间可见" unCheckedChildren="仅自己可见" />
            </div>
          </div>

          {/* 推荐问题管理抽屉：文本域每行一条，确认后生效 */}
          <CommonDrawer
            destroyOnClose
            open={recDrawerOpen}
            placement="right"
            title="推荐问题"
            width={400}
            footer={
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <Button onClick={() => setRecDrawerOpen(false)}>取消</Button>
                <Button
                  type="primary"
                  onClick={handleRecConfirm}
                  style={{
                    background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
                    border: 'none',
                  }}
                >
                  确认
                </Button>
              </div>
            }
            onClose={() => setRecDrawerOpen(false)}
          >
            <Input.TextArea
              autoSize={{ minRows: 14, maxRows: 24 }}
              placeholder="请配置助手推荐问题，每行输入一条。"
              value={recDraft}
              onChange={(e) => setRecDraft(e.target.value)}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(130, 140, 200, 0.2)',
              }}
            />
          </CommonDrawer>

          {/* 扩展能力工具选择抽屉 */}
          <ToolPickerDrawer
            open={toolPickerOpen}
            selectedToolIds={selectedToolIds}
            spaceId={spaceId}
            onBatchToggle={handleBatchToolCheck}
            onClose={() => setToolPickerOpen(false)}
            onToggle={handleToolCheck}
            onToolsLoaded={mergeOptionNames}
          />

          {/* 数据语义选择抽屉 */}
          <CapabilityPickerDrawer
            icon={<BookOutlined />}
            open={semanticPickerOpen}
            selectedIds={selectedSemanticIds}
            spaceId={spaceId}
            tabs={semanticPickerTabs}
            title="添加数据语义"
            onBatchToggle={makeBatchToggle(setSelectedSemanticIds)}
            onClose={() => setSemanticPickerOpen(false)}
            onOptionsLoaded={mergeOptionNames}
            onToggle={makeToggle(setSelectedSemanticIds)}
          />

          {/* 技能选择抽屉 */}
          <CapabilityPickerDrawer
            icon={<ThunderboltOutlined />}
            open={skillPickerOpen}
            selectedIds={selectedSkillIds}
            spaceId={spaceId}
            tabs={skillPickerTabs}
            title="添加技能"
            onBatchToggle={makeBatchToggle(setSelectedSkillIds)}
            onClose={() => setSkillPickerOpen(false)}
            onOptionsLoaded={mergeOptionNames}
            onToggle={makeToggle(setSelectedSkillIds)}
          />

          {/* AI模型选择抽屉（单选，仅语言模型） */}
          <ModelPickerDrawer
            open={modelPickerOpen}
            selectedIds={selectedModelIds}
            singleSelect
            spaceId={spaceId}
            onBatchToggle={() => {}}
            onClose={() => setModelPickerOpen(false)}
            onOptionsLoaded={mergeOptionNames}
            onToggle={handleModelSingleSelect}
          />

          {/* 开场引导编辑 Modal */}
          <Modal
            centered
            destroyOnClose
            okText="确认"
            cancelText="取消"
            open={prologueModalOpen}
            title="开场引导"
            width={560}
            onOk={() => {
              setPrologue(prologueDraft.trim())
              setPrologueModalOpen(false)
            }}
            onCancel={() => setPrologueModalOpen(false)}
          >
            <div style={{ color: '#3e5068', fontSize: 13, marginBottom: 12 }}>设置助手对话开始时的开场引导语。</div>
            <Input.TextArea
              autoSize={{ minRows: 6, maxRows: 12 }}
              placeholder="请输入开场引导语，例如：你好，我是你的智能助手，有什么可以帮助你的？"
              value={prologueDraft}
              onChange={(e) => setPrologueDraft(e.target.value)}
              style={{
                borderRadius: 8,
                border: '1px solid rgba(130, 140, 200, 0.2)',
              }}
            />
          </Modal>

          {/* 右：调试预览 */}
          <div
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(248, 250, 255, 0.6) 100%)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <SectionHeader icon={headerIcon} title="调试预览" />
            <div style={{ flex: 1, overflow: 'auto', padding: '18px 24px' }}>
              <div
                style={{
                  color: '#8fa0b5',
                  fontSize: 12,
                  marginBottom: 18,
                  textAlign: 'center',
                  fontWeight: 500,
                }}
              >
                ----------- 配置已更新 -----------
              </div>
              <div style={{ alignItems: 'flex-start', display: 'flex', gap: 10 }}>
                <div
                  style={{
                    alignItems: 'center',
                    background: 'linear-gradient(135deg, #fa8c16 0%, #fa541c 100%)',
                    borderRadius: 8,
                    color: '#fff',
                    display: 'flex',
                    flexShrink: 0,
                    fontSize: 12,
                    fontWeight: 700,
                    height: 28,
                    justifyContent: 'center',
                    width: 28,
                    boxShadow: '0 2px 8px rgba(250, 140, 22, 0.3)',
                  }}
                >
                  =
                </div>
                <div
                  style={{
                    background: 'rgba(246, 247, 255, 0.8)',
                    backdropFilter: 'blur(8px)',
                    borderRadius: 10,
                    fontSize: 13,
                    lineHeight: 1.7,
                    padding: '12px 16px',
                    color: '#3e5068',
                    border: '1px solid rgba(130, 140, 200, 0.1)',
                  }}
                >
                  {description || `你好，我是你的${name || '智能助手'}，有什么可以帮助你的？`}
                </div>
              </div>
            </div>

            {/* 推荐问题 + 输入栏 */}
            <div style={{ padding: '10px 24px 18px' }}>
              <div style={{ color: '#5f7490', fontSize: 12, marginBottom: 10, fontWeight: 500 }}>推荐问题</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                {recQuestions.length > 0 ? (
                  recQuestions.map((q: string) => (
                    <Tag
                      key={q}
                      color="processing"
                      style={{
                        background: 'linear-gradient(135deg, rgba(91, 124, 247, 0.08) 0%, rgba(112, 145, 250, 0.08) 100%)',
                        border: '1px solid rgba(91, 124, 247, 0.2)',
                        borderRadius: 8,
                        color: '#5b7cf7',
                        cursor: 'pointer',
                        fontSize: 12,
                        margin: 0,
                        padding: '6px 12px',
                        width: 'fit-content',
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {q}
                    </Tag>
                  ))
                ) : (
                  <span style={{ color: '#9ca3af', fontSize: 12 }}>暂无推荐问题</span>
                )}
              </div>
              <Input
                placeholder="请输入问题"
                size="large"
                suffix={<SendOutlined style={{ color: '#5b7cf7' }} />}
                style={{
                  borderRadius: 10,
                  border: '1px solid rgba(130, 140, 200, 0.2)',
                  background: 'rgba(255, 255, 255, 0.6)',
                }}
              />
            </div>
          </div>
        </div>
      </Spin>
    </CommonDrawer>
  )
}

// 区域大标题（带浅灰背景）
const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode }> = ({ icon, title }) => (
  <div
    style={{
      alignItems: 'center',
      background: 'linear-gradient(180deg, rgba(248, 250, 255, 0.8) 0%, rgba(246, 247, 255, 0.8) 100%)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid rgba(130, 140, 200, 0.12)',
      display: 'flex',
      gap: 10,
      height: 44,
      padding: '0 18px',
    }}
  >
    {icon}
    <span style={{ fontWeight: 600, color: '#3e5068' }}>{title}</span>
  </div>
)

// 中栏分组小标题
const GroupTitle: React.FC<{ title: string; color?: string; icon?: React.ReactNode }> = ({ title, color = '#5b7cf7', icon }) => (
  <div
    style={{
      background: `linear-gradient(135deg, ${color}08 0%, ${color}04 100%)`,
      color: '#1a2744',
      fontSize: 14,
      fontWeight: 600,
      padding: '16px 24px',
      borderBottom: `1px solid ${color}15`,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
      position: 'relative',
      overflow: 'hidden',
    }}
  >
    {icon && (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 16,
          boxShadow: `0 4px 12px ${color}50, inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
    )}
    <span style={{ letterSpacing: '0.03em', fontSize: 15 }}>{title}</span>
  </div>
)

// 折叠行下方的已选项列表：每行固定高度，最多展示 5 行，超出内部滚动
const SELECTED_ITEM_ROW_HEIGHT = 32
// 单个已选项行：序号 + 名称，右侧用文件夹图标标注所属分组的层级路径（形如「父组 / 子组」）
const SelectedRow: React.FC<{ index: number; name: string; groupPath?: string; paddingLeft?: number }> = ({ groupPath, index, name, paddingLeft = 24 }) => (
  <div
    style={{
      alignItems: 'center',
      color: '#3e5068',
      display: 'flex',
      fontSize: 13,
      gap: 8,
      height: SELECTED_ITEM_ROW_HEIGHT,
      lineHeight: 1.6,
      overflow: 'hidden',
      padding: `0 24px 0 ${paddingLeft}px`,
    }}
  >
    <span style={{ color: '#8fa0b5', flexShrink: 0, fontSize: 12 }}>{index}.</span>
    <span style={{ flexShrink: groupPath ? 0 : 1, maxWidth: groupPath ? '52%' : '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    {groupPath ? (
      <span
        style={{ alignItems: 'center', color: '#8fa0b5', display: 'flex', flex: 1, fontSize: 12, gap: 4, justifyContent: 'flex-end', minWidth: 0, overflow: 'hidden' }}
        title={groupPath}
      >
        <FolderOutlined style={{ color: '#358cf3', flexShrink: 0, fontSize: 12 }} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{groupPath}</span>
      </span>
    ) : null}
  </div>
)

const SelectedItemList: React.FC<{ ids: Set<string>; nameMap: Record<string, string>; groupMap: Record<string, string>; emptyText: string }> = ({ emptyText, groupMap, ids, nameMap }) => {
  const items = Array.from(ids)
  if (items.length === 0) {
    return <div style={{ color: '#8fa0b5', fontSize: 13, padding: '8px 24px' }}>{emptyText}</div>
  }
  return (
    <div style={{ maxHeight: SELECTED_ITEM_ROW_HEIGHT * 5, overflowY: 'auto' }}>
      {items.map((id, i) => (
        <SelectedRow key={id} groupPath={groupMap[id]} index={i + 1} name={nameMap[id] ?? id} />
      ))}
    </div>
  )
}

// 工具已选列表：按 MCP工具 / 内置工具 两组区分展示（id 前缀 mcp_ / builtin_）
const SelectedToolList: React.FC<{ ids: Set<string>; nameMap: Record<string, string>; groupMap: Record<string, string>; emptyText: string }> = ({ emptyText, groupMap, ids, nameMap }) => {
  const all = Array.from(ids)
  if (all.length === 0) {
    return <div style={{ color: '#8fa0b5', fontSize: 13, padding: '8px 24px' }}>{emptyText}</div>
  }
  const mcpItems = all.filter((id) => id.startsWith('mcp_'))
  const builtinItems = all.filter((id) => id.startsWith('builtin_'))
  const others = all.filter((id) => !id.startsWith('mcp_') && !id.startsWith('builtin_'))

  const renderGroup = (label: string, items: string[]) => {
    if (items.length === 0) return null
    // 分组辨识色：MCP工具=蓝、内置工具=橙（与“扩展能力”分组色一致）、其他=灰
    const dot = label === 'MCP工具' ? '#5b7cf7' : label === '内置工具' ? '#f59e0b' : '#8fa0b5'
    return (
      <div key={label} style={{ marginTop: 4 }}>
        <div style={{ alignItems: 'center', display: 'flex', gap: 6, padding: '6px 24px 4px' }}>
          <span style={{ background: dot, borderRadius: '50%', flexShrink: 0, height: 6, width: 6 }} />
          <span style={{ color: '#5a6b85', fontSize: 12, fontWeight: 600 }}>{label}</span>
          <span
            style={{
              background: 'rgba(130, 140, 200, 0.1)',
              borderRadius: 8,
              color: '#8fa0b5',
              fontSize: 11,
              fontWeight: 500,
              lineHeight: '16px',
              padding: '0 6px',
            }}
          >
            {items.length}
          </span>
        </div>
        {items.map((id, i) => (
          <SelectedRow key={id} groupPath={groupMap[id]} index={i + 1} name={nameMap[id] ?? id} paddingLeft={36} />
        ))}
      </div>
    )
  }

  return (
    <div style={{ maxHeight: SELECTED_ITEM_ROW_HEIGHT * 6, overflowY: 'auto' }}>
      {renderGroup('MCP工具', mcpItems)}
      {renderGroup('内置工具', builtinItems)}
      {renderGroup('其他', others)}
    </div>
  )
}

// 折叠行
interface CollapseRowProps {
  title: string
  open: boolean
  onToggle: () => void
  extra?: React.ReactNode
  titleExtra?: React.ReactNode
  children?: React.ReactNode
}
const CollapseRow: React.FC<CollapseRowProps> = ({ children, extra, onToggle, open, title, titleExtra }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(130, 140, 200, 0.08)',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        style={{
          alignItems: 'center',
          cursor: 'pointer',
          display: 'flex',
          height: 48,
          padding: '0 20px',
          transition: 'all 0.2s ease',
          background: isHovered ? 'rgba(91, 124, 247, 0.03)' : 'transparent',
        }}
        onClick={onToggle}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 6,
            background: open ? 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)' : 'rgba(130, 140, 200, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            transition: 'all 0.3s ease',
            boxShadow: open ? '0 2px 8px rgba(91, 124, 247, 0.3)' : 'none',
          }}
        >
          {open ? <CaretDownOutlined style={{ color: '#fff', fontSize: 10 }} /> : <CaretRightOutlined style={{ color: '#8fa0b5', fontSize: 10 }} />}
        </div>
        <span style={{ fontWeight: 500, color: '#1a2744', fontSize: 13 }}>{title}</span>
        {titleExtra}
        <span style={{ marginLeft: 'auto' }} onClick={(e) => e.stopPropagation()}>
          {extra}
        </span>
      </div>
      {open && children ? (
        <div
          style={{
            paddingBottom: 12,
            background: 'rgba(248, 250, 255, 0.3)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          {children}
        </div>
      ) : null}
    </div>
  )
}

export default AssistantEditDrawer
