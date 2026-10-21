import {
  ArrowLeftOutlined,
  BookOutlined,
  CaretDownOutlined,
  CaretRightOutlined,
  EditOutlined,
  ExperimentOutlined,
  FolderOutlined,
  LoadingOutlined,
  QuestionCircleOutlined,
  SecurityScanOutlined,
  SendOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Input, Spin, Switch, Tag } from 'antd'
import type { FC } from 'react'
import React, { useEffect, useMemo, useRef, useState } from 'react'

import { AssistantIconBlock } from '@/components/AssistantIcon'
import ExploreMessageRow from '@/components/conversation/exploration-mode/v2/ExploreMessageRow'
import { LazyFeatureFallback, RetryableLazy } from '@/components/performance/RetryableLazy'
import { fetchModelList } from '@/service/api/abi-system'
import { fetchAssistantDetail } from '@/service/api/assistant'
import { getSpaceId } from '@/utils/runtime'
import { useAssistantDebugChat } from './-useAssistantDebugChat'

const loadExplorePreviewPane = () => import('@/components/conversation/exploration-mode/ExplorePreviewPane')

/** 助手卡片兜底数据：抽屉打开瞬间先展示，详情接口返回后覆盖 */
export type AssistantDetailFallback = {
  id: string
  name: string
  description?: string
  icon?: string
  status?: string
  createTime?: string
}

type Props = {
  open: boolean
  onClose: () => void
  appId?: string | number
  fallback?: AssistantDetailFallback | null
}

/** chat 请求拦截器返回 { code, msg, data }，详情对象兼容 data.data / data */
function unwrapObject(res: any): any {
  const d = res?.data
  return d?.data || d || {}
}

/** 从数组响应中提取 rows */
function pickRows(res: any): any[] {
  const rows = res?.rows ?? res?.data?.rows ?? res?.data?.list ?? res?.data
  return Array.isArray(rows) ? rows : []
}

/** 折叠面板分组 */
type SectionKey = 'model' | 'opening' | 'questions' | 'semantic' | 'mcp' | 'skill'

/** 应用工坊-我的助手：只读详情抽屉（复刻管理端 AssistantEditDrawer 三栏布局） */
const AssistantDetailDrawer: FC<Props> = ({ open, onClose, appId, fallback }) => {
  const [name, setName] = useState<string>('')
  const [prompt, setPrompt] = useState<string>('')
  // 开场引导（与管理端一致读 version.prologue）
  const [prologue, setPrologue] = useState<string>('')
  const [description, setDescription] = useState<string>('')
  const [iconKey, setIconKey] = useState<string | undefined>(undefined)
  const [enableDebug, setEnableDebug] = useState(false)
  const [publicAccess, setPublicAccess] = useState<'0' | '1'>('1')
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [recQuestions, setRecQuestions] = useState<string[]>([])

  // ── AI模型配置 单选（存 chatModelId）──
  const [selectedModelIds, setSelectedModelIds] = useState<Set<string>>(new Set())

  // ── 数据语义 / 技能 / 工具 选中集合 ──
  const [selectedSemanticIds, setSelectedSemanticIds] = useState<Set<string>>(new Set())
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set())
  const [selectedToolIds, setSelectedToolIds] = useState<Set<string>>(new Set())

  // id -> 名称 / 分组 映射
  const [optionNameMap, setOptionNameMap] = useState<Record<string, string>>({})
  const [optionGroupMap, setOptionGroupMap] = useState<Record<string, string>>({})

  // 折叠面板状态
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    model: false,
    opening: false,
    questions: false,
    semantic: false,
    mcp: false,
    skill: false,
  })
  const toggle = (key: SectionKey) => setOpenMap((p) => ({ ...p, [key]: !p[key] }))

  // ── 右侧调试预览：接入探索模式流式对话（对齐管理端 useAssistantDebugChat）──
  const [chatInput, setChatInput] = useState('')
  // 当前展开的探索项 id（内容随流式更新，故只存 id 再从实时列表取）
  const [previewId, setPreviewId] = useState<string | null>(null)
  // 工作室当前结果屏绑定的步骤，与主聊天一致支持切换定位
  const [previewStepId, setPreviewStepId] = useState<string>()
  // 数据语义可多选，但探索接口只收单个 schema_id：取第一个已选语义
  const firstSchemaId = useMemo(() => {
    const first = Array.from(selectedSemanticIds)[0]
    return first ? Number(String(first).replace('schema_', '')) || undefined : undefined
  }, [selectedSemanticIds])
  // 对话模型单选：model_<id> 反解为 chatModelId
  const debugChatModelId = useMemo(() => {
    const first = Array.from(selectedModelIds)[0]
    return first ? Number(String(first).replace('model_', '')) || undefined : undefined
  }, [selectedModelIds])
  // 技能 -> skills_source_version_ids
  const skillSourceVersionIds = useMemo(
    () => Array.from(selectedSkillIds).map((id) => String(id).replace('skill_', '')),
    [selectedSkillIds],
  )

  const { items: debugItems, loading: debugLoading, handleSend, stopGenerating } = useAssistantDebugChat({
    appId,
    spaceId: getSpaceId(),
    schemaId: firstSchemaId,
    chatModelId: debugChatModelId,
    isDebug: enableDebug,
  })

  // 展开的探索项：从实时列表按 id 取，保证流式更新时预览同步刷新
  const previewItem = useMemo(() => debugItems.find((it) => it.id === previewId) || null, [debugItems, previewId])

  // 调试预览区滚动容器：提交问题后定位到当前执行项
  const debugScrollRef = useRef<HTMLDivElement>(null)

  /** 提交调试问题：清空输入并走探索模式流式接口 */
  const submitDebug = () => {
    if (debugLoading) return
    const q = chatInput.trim()
    if (!q) return
    setChatInput('')
    handleSend(q, { skillSourceVersionIds })

    // 发送后定位到当前执行问题，与 chat 端探索发送行为一致
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const container = debugScrollRef.current
        if (!container) return
        container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' })
      })
    })
  }

  const mergeOptionNames = (options: { id: string; name: string; groupPath?: string }[]) => {
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
  }

  /** 加载助手详情 */
  async function loadDetail() {
    if (!appId) return
    setLoadingDetail(true)
    try {
      const res: any = await fetchAssistantDetail({ appId })
      const detail = unwrapObject(res)
      const versions: any[] = Array.isArray(detail.versions) ? detail.versions : []
      const version: any =
        versions.find((v: any) => String(v.versionId) === String(detail.latestVersionId)) ||
        versions[0] ||
        detail

      setName(detail.appName || fallback?.name || '')
      setPrompt(version.appPrompt || detail.appPrompt || '')
      setPrologue(version.prologue || detail.prologue || '')
      setDescription(detail.description || fallback?.description || '')
      setIconKey(detail.icon || undefined)
      setEnableDebug(detail.enableDebug === '1')
      setPublicAccess(detail.publicAccess === '1' ? '1' : '0')

      // 推荐问题
      if (Array.isArray(version.recQuery)) {
        setRecQuestions(version.recQuery)
      }

      // 工具选中回显
      if (Array.isArray(version.tools) && version.tools.length > 0) {
        const ids = new Set<string>()
        const names: { id: string; name: string; groupPath?: string }[] = []
        version.tools.forEach((t: any) => {
          const prefix = t.toolType === '2' ? 'mcp' : 'builtin'
          if (Array.isArray(t.toolConfig)) {
            t.toolConfig.forEach((c: any) => {
              if (c.id != null) {
                const fid = `${prefix}_${c.id}`
                ids.add(fid)
                if (c.name) names.push({ id: fid, name: c.name, groupPath: c.groupPath })
              }
            })
          }
        })
        setSelectedToolIds(ids)
        if (names.length) mergeOptionNames(names)
      } else {
        setSelectedToolIds(new Set())
      }

      // 数据语义选中回显
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
      } else {
        setSelectedSemanticIds(new Set())
      }

      // 技能选中回显
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
      } else {
        setSelectedSkillIds(new Set())
      }

      // AI模型（单选）回显：chatModelId -> model_<id>，并解析模型名用于展示
      if (version.chatModelId != null && String(version.chatModelId) !== '') {
        const mid = `model_${version.chatModelId}`
        setSelectedModelIds(new Set([mid]))
        try {
          const modelRes: any = await fetchModelList({
            pageNum: 1,
            pageSize: 999,
            spaceId: Number(getSpaceId() || 0),
          })
          const rows: any[] = pickRows(modelRes)
          const hit = rows.find((m: any) => String(m.modelId ?? m.llmId) === String(version.chatModelId))
          if (hit) mergeOptionNames([{ id: mid, name: hit.modelName || '-' }])
        } catch {
          // 忽略名称解析失败，仍展示 id
        }
      } else {
        setSelectedModelIds(new Set())
      }
    } catch {
      setName(fallback?.name || '')
      setDescription(fallback?.description || '')
      setIconKey(fallback?.icon)
    } finally {
      setLoadingDetail(false)
    }
  }

  useEffect(() => {
    if (open && appId) {
      loadDetail()
    }
  }, [open, appId])

  const headerIcon = useMemo(() => <AssistantIconBlock iconKey={iconKey} radius={8} size={28} />, [iconKey])

  return (
    <Drawer
      className="assistant-detail-drawer"
      closable={false}
      open={open}
      placement="right"
      title={null}
      width="100%"
      bodyStyle={{ padding: 0 }}
      onClose={onClose}
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
            onClick={onClose}
            style={{
              borderRadius: 8,
              transition: 'all 0.3s ease',
            }}
          />
          <div style={{ alignItems: 'center', display: 'flex', gap: 10, marginLeft: 10 }}>
            {headerIcon}
            <span style={{ fontSize: 16, fontWeight: 600, color: name ? '#1a2744' : '#8fa0b5' }}>
              {name || '编辑助手名称'}
            </span>
          </div>
          <div style={{ alignItems: 'center', display: 'flex', gap: 12, marginLeft: 'auto' }} />
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
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden', padding: '10px 18px 18px' }}>
              <Input.TextArea
                readOnly
                bordered={false}
                placeholder={`请输入您的专属AI角色设定提示词。建议包含：身份背景、性格语气、专业领域及输出要求。设定越清晰，AI的回答越精准。\n\n一键套用模板：角色：[资深数据分析师] + 语气：[客观严谨/通俗易懂] + 任务：[生成Q3财报解读] + 格式：[Markdown/要点列表]。\n\n参考示例：你现在是一位拥有10年经验的资深商业数据分析师，性格严谨客观，擅长从复杂数据中挖掘业务洞察。请基于我提供的原始数据，输出一份结构清晰的月度销售数据报告。要求：必须包含核心指标摘要、数据可视化建议、异常波动归因分析，以及3条可落地的业务优化策略。语言风格需保持专业、精炼，杜绝主观臆断。`}
                style={{
                  height: '100%',
                  resize: 'none',
                  background: 'rgba(255, 255, 255, 0.6)',
                  borderRadius: 10,
                  padding: '12px 14px',
                  fontSize: 13,
                  lineHeight: 1.6,
                }}
                value={prompt}
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
            {/* AI模型配置 */}
            <CollapseRow
              extra={
                selectedModelIds.size > 0 ? (
                  <span style={{ color: '#8fa0b5', fontSize: 12 }}>已选 {selectedModelIds.size} 项</span>
                ) : null
              }
              open={openMap.model}
              title="AI模型配置"
              onToggle={() => toggle('model')}
            >
              <SelectedItemList emptyText="暂未添加模型" groupMap={optionGroupMap} ids={selectedModelIds} nameMap={optionNameMap} />
            </CollapseRow>

            {/* 开场引导 */}
            <CollapseRow
              open={openMap.opening}
              title="开场引导"
              onToggle={() => toggle('opening')}
            >
              {prologue ? (
                <div style={{ color: '#3e5068', fontSize: 13, lineHeight: 1.6, padding: '6px 24px', whiteSpace: 'pre-wrap' }}>
                  {prologue}
                </div>
              ) : (
                <div style={{ color: '#8fa0b5', fontSize: 13, padding: '8px 24px' }}>暂未设置开场引导</div>
              )}
            </CollapseRow>

            {/* 应用icon */}
            <IconPickerRow title="应用icon" />

            <GroupTitle title="知识语义" color="#10b981" icon={<BookOutlined />} />

            {/* 数据语义 */}
            <CollapseRow
              extra={
                selectedSemanticIds.size > 0 ? (
                  <span style={{ color: '#8fa0b5', fontSize: 12 }}>已选 {selectedSemanticIds.size} 项</span>
                ) : null
              }
              open={openMap.semantic}
              title="数据语义"
              onToggle={() => toggle('semantic')}
            >
              <SelectedItemList emptyText="暂未添加数据语义" groupMap={optionGroupMap} ids={selectedSemanticIds} nameMap={optionNameMap} />
            </CollapseRow>

            <GroupTitle title="扩展能力" color="#f59e0b" icon={<ThunderboltOutlined />} />

            {/* 工具 */}
            <CollapseRow
              extra={
                selectedToolIds.size > 0 ? (
                  <span style={{ color: '#8fa0b5', fontSize: 12 }}>已选 {selectedToolIds.size} 项</span>
                ) : null
              }
              open={openMap.mcp}
              title="工具"
              onToggle={() => toggle('mcp')}
            >
              <SelectedToolList emptyText="暂未添加工具" groupMap={optionGroupMap} ids={selectedToolIds} nameMap={optionNameMap} />
            </CollapseRow>

            {/* 技能 */}
            <CollapseRow
              extra={
                selectedSkillIds.size > 0 ? (
                  <span style={{ color: '#8fa0b5', fontSize: 12 }}>已选 {selectedSkillIds.size} 项</span>
                ) : null
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
                <div style={{ color: '#5b7cf7', cursor: 'pointer', fontSize: 12, padding: '6px 24px', fontWeight: 500 }}>
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
              <Switch
                checked={enableDebug}
                onChange={(checked) => setEnableDebug(checked)}
                disabled
              />
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
              <Switch
                checked={publicAccess === '1'}
                onChange={(checked) => setPublicAccess(checked ? '1' : '0')}
                checkedChildren="空间可见"
                unCheckedChildren="仅自己可见"
                disabled
              />
            </div>
          </div>

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
            <div ref={debugScrollRef} style={{ flex: 1, overflow: 'auto', padding: '18px 24px' }}>
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
                <AssistantIconBlock iconKey={iconKey} radius={8} size={28} />
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
              {/* 探索模式对话时间线：接入真实流式结果 */}
              {debugItems.length > 0 && (
                <div style={{ marginTop: 18 }}>
                  {debugItems.map((it) => (
                    <ExploreMessageRow
                      key={it.id}
                      item={it}
                      scrollContainerRef={debugScrollRef}
                      locateStepId={previewStepId}
                      onClose={() => {
                        setPreviewId(null)
                        setPreviewStepId(undefined)
                      }}
                      active={previewId === it.id}
                      onOpen={() => {
                        void loadExplorePreviewPane()
                        setPreviewId(it.id)
                        setPreviewStepId(undefined)
                      }}
                    />
                  ))}
                </div>
              )}
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
                      onClick={() => {
                        if (debugLoading) return
                        handleSend(q, { skillSourceVersionIds })
                      }}
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
                placeholder={debugLoading ? 'AI 正在思考，可点击右侧停止…' : '请输入问题'}
                size="large"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onPressEnter={submitDebug}
                suffix={
                  debugLoading ? (
                    <LoadingOutlined style={{ color: '#5b7cf7', cursor: 'pointer' }} title="停止生成" onClick={stopGenerating} />
                  ) : (
                    <SendOutlined style={{ color: '#5b7cf7', cursor: 'pointer' }} onClick={submitDebug} />
                  )
                }
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

      {/* 调试结果工作室：展开某条探索项的全部执行数据、最终结论与摘要 */}
      <Drawer
        destroyOnClose
        open={!!previewItem}
        placement="right"
        width={680}
        closable={false}
        title={null}
        bodyStyle={{ padding: 0, height: '100%' }}
        onClose={() => setPreviewId(null)}
      >
        {previewItem && (
          <RetryableLazy
            loader={loadExplorePreviewPane}
            componentProps={{ item: previewItem, onClose: () => { setPreviewId(null); setPreviewStepId(undefined) }, activeStepId: previewStepId, onScreenChange: setPreviewStepId }}
            fallback={<LazyFeatureFallback label="正在加载探索结果…" style={{ width: '100%', height: '100%', minHeight: 360 }} />}
          />
        )}
      </Drawer>
    </Drawer>
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

// 应用icon 触发行
const IconPickerRow = React.forwardRef<HTMLDivElement, { title: string } & React.HTMLAttributes<HTMLDivElement>>(({ title, ...rest }, ref) => {
  const [isHovered, setIsHovered] = useState(false)
  return (
    <div ref={ref} style={{ borderBottom: '1px solid rgba(130, 140, 200, 0.08)', transition: 'all 0.2s ease' }} {...rest}>
      <div
        style={{
          alignItems: 'center',
          background: isHovered ? 'rgba(91, 124, 247, 0.03)' : 'transparent',
          cursor: 'pointer',
          display: 'flex',
          height: 48,
          padding: '0 20px',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div
          style={{
            alignItems: 'center',
            background: 'rgba(130, 140, 200, 0.08)',
            borderRadius: 6,
            display: 'flex',
            height: 20,
            justifyContent: 'center',
            marginRight: 12,
            width: 20,
          }}
        >
          <CaretRightOutlined style={{ color: '#8fa0b5', fontSize: 10 }} />
        </div>
        <span style={{ color: '#1a2744', fontSize: 13, fontWeight: 500 }}>{title}</span>
        <span style={{ marginLeft: 'auto' }}>
          <EditOutlined style={{ color: '#8fa0b5', fontSize: 12 }} />
        </span>
      </div>
    </div>
  )
})
IconPickerRow.displayName = 'IconPickerRow'

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
          {open ? (
            <CaretDownOutlined style={{ color: '#fff', fontSize: 10 }} />
          ) : (
            <CaretRightOutlined style={{ color: '#8fa0b5', fontSize: 10 }} />
          )}
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

const SELECTED_ITEM_ROW_HEIGHT = 32

// 单个已选项行
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

export default AssistantDetailDrawer
