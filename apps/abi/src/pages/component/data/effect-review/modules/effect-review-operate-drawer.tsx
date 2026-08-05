import { AuditOutlined, CaretRightOutlined, DislikeFilled, FileTextOutlined, LikeFilled, RobotOutlined, SolutionOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { Tag, message } from 'antd'
import dayjs from 'dayjs'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { EVAL_EXPERT_OPTIONS, EVAL_LLM_OPTIONS, MEMORY_CHAT_MODE_OPTIONS, MEMORY_STATUS_OPTIONS } from '@/constants/assistant-config'
import { fetchMemoryDetail, fetchModelEval } from '@/service/api/assistant-manage'

type Props = Page.OperateDrawerProps

/** 分区标题 — 对齐平台抽屉风格（渐变图标 + 标题 + 底部分隔线） */
const SectionTitle: FC<{ icon: React.ReactNode; title: string; color?: string; extra?: React.ReactNode }> = ({ color = '#5b7cf7', extra, icon, title }) => (
  <div
    style={{
      alignItems: 'center',
      borderBottom: '1px solid rgba(130, 140, 200, 0.10)',
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: 16,
      padding: '10px 0',
    }}
  >
    <div style={{ alignItems: 'center', display: 'flex', gap: 10 }}>
      <div
        style={{
          alignItems: 'center',
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          borderRadius: 7,
          boxShadow: `0 2px 8px ${color}30`,
          color: '#fff',
          display: 'flex',
          fontSize: 13,
          height: 26,
          justifyContent: 'center',
          width: 26,
        }}
      >
        {icon}
      </div>
      <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600, letterSpacing: '0.02em' }}>{title}</span>
    </div>
    {extra}
  </div>
)

/** 只读字段标签，统一色值与字重 */
const fieldLabel = (text: string) => <span style={{ color: '#3e5068', fontWeight: 500 }}>{text}</span>

/** 只读纯文本展示（单行/短文本），带字段底框，避免裸文本直接显示 */
const ReadonlyText: FC<{ value?: React.ReactNode }> = ({ value }) => (
  <div
    style={{
      background: 'rgba(130, 140, 200, 0.06)',
      border: '1px solid rgba(130, 140, 200, 0.14)',
      borderRadius: 8,
      color: '#1a2744',
      fontSize: 14,
      lineHeight: '22px',
      minHeight: 40,
      padding: '8px 12px',
      wordBreak: 'break-word',
    }}
  >
    {value != null && value !== '' ? value : <span style={{ color: '#a3b3c8' }}>-</span>}
  </div>
)

/** 尝试将字符串格式化为缩进 2 空格的 JSON，解析失败则原样返回 */
const formatMaybeJson = (value?: string): string | undefined => {
  if (!value) return value
  try {
    return JSON.stringify(JSON.parse(value), null, 2)
  } catch {
    return value
  }
}

/** 只读长文本块（ai信息 / view信息），限定高度、内部滚动 */
const ReadonlyBlock: FC<{ value?: string }> = ({ value }) => (
  <div
    style={{
      background: 'rgba(130, 140, 200, 0.06)',
      border: '1px solid rgba(130, 140, 200, 0.14)',
      borderRadius: 8,
      color: '#3e5068',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 13,
      lineHeight: '20px',
      maxHeight: 220,
      minHeight: 64,
      overflow: 'auto',
      padding: '10px 12px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}
  >
    {value || <span style={{ color: '#a3b3c8' }}>无</span>}
  </div>
)

/** ai信息 步骤元信息：chat_step → 中文名 + 主题色 */
const AI_STEP_META: Record<string, { color: string; label: string }> = {
  analysis_abstract: { color: '#f59e0b', label: '归因摘要' },
  chart_generation: { color: '#14b8a6', label: '图表生成' },
  excel_abstract: { color: '#22c55e', label: 'excel摘要' },
  intent_clarify: { color: '#8b5cf6', label: '意图澄清' },
  intent_detection: { color: '#6366f1', label: '意图识别' },
  mcp_abstract: { color: '#d946ef', label: 'MCP结果摘要' },
  mcp_call: { color: '#ec4899', label: 'MCP调用' },
  predict_abstract: { color: '#f97316', label: '预测摘要' },
  query_abstract: { color: '#10b981', label: '问数摘要' },
  result_generation: { color: '#5b7cf7', label: '结果生成' },
  semantic_extract: { color: '#0ea5e9', label: '语义提取' },
  sql_query: { color: '#06b6d4', label: 'SQL查数' },
  user_input: { color: '#5b7cf7', label: '用户输入' },
}

/** 部分后端仅用统一的 abstract_extract 表示“摘要”步骤，按场景映射到对应中文名 */
const ABSTRACT_STEP_BY_MODE: Record<string, string> = {
  chat_excel: 'excel_abstract',
  chat_with_analysis: 'analysis_abstract',
  chat_with_db_execute: 'query_abstract',
  chat_with_predict: 'predict_abstract',
}

const getStepMeta = (chatStep?: string, chatMode?: string) => {
  const key = (chatStep || '').trim()
  if (AI_STEP_META[key]) return AI_STEP_META[key]
  if ((key === 'abstract_extract' || key === 'abstract') && chatMode && ABSTRACT_STEP_BY_MODE[chatMode]) {
    return AI_STEP_META[ABSTRACT_STEP_BY_MODE[chatMode]]
  }
  return { color: '#8695ab', label: key || '未知步骤' }
}

/** ai信息 content 内部字段的中文标签 */
const CONTENT_FIELD_LABELS: Record<string, string> = {
  chat_mode: '场景模式',
  dimensions: '维度',
  dimensions_zh: '维度名称',
  direct_response: '直接回复',
  display_type: '展示类型',
  filters: '过滤条件',
  group_by: '分组',
  having: 'Having 条件',
  limit: '数据条数',
  llm_opinion: '模型意见',
  metrics: '指标',
  metrics_zh: '指标名称',
  order_by: '排序',
  predict_type: '预测类型',
  relations: '表关联',
  result_explain: '结果说明',
  sql: 'SQL 语句',
  thoughts: '思考过程',
  time_range: '时间范围',
}

const LONG_TEXT_KEYS = new Set(['result_explain', 'thoughts', 'direct_response', 'llm_opinion', 'llmOpinion'])

const isPlainObject = (v: any) => !!v && typeof v === 'object' && !Array.isArray(v)

/** 富文本渲染：支持 **加粗** 与换行，用于 result_explain / thoughts 等长文本 */
const renderRichText = (text: string) =>
  String(text)
    .split('\n')
    .map((line, li) => (
      <div key={li} style={{ minHeight: line ? undefined : '0.6em' }}>
        {line.split('**').map((seg, si) => (si % 2 === 1 ? <strong key={si} style={{ color: '#1a2744' }}>{seg}</strong> : <span key={si}>{seg}</span>))}
      </div>
    ))

/** 长文本 / 富文本展示块 */
const RichBlock: FC<{ value: string }> = ({ value }) => (
  <div
    style={{
      background: 'rgba(130, 140, 200, 0.06)',
      border: '1px solid rgba(130, 140, 200, 0.14)',
      borderRadius: 8,
      color: '#3e5068',
      fontSize: 13,
      lineHeight: '21px',
      maxHeight: 260,
      overflow: 'auto',
      padding: '10px 12px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}
  >
    {renderRichText(value)}
  </div>
)

/** 等宽代码块（SQL / JSON） */
const CodeBlock: FC<{ value: string }> = ({ value }) => (
  <pre
    style={{
      background: 'rgba(26, 39, 68, 0.04)',
      border: '1px solid rgba(130, 140, 200, 0.14)',
      borderRadius: 8,
      color: '#3e5068',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
      fontSize: 12.5,
      lineHeight: '19px',
      margin: 0,
      maxHeight: 260,
      overflow: 'auto',
      padding: '10px 12px',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
    }}
  >
    {value}
  </pre>
)

/** 渲染单个 content 字段（对象场景下按字段拆分展示） */
const ContentField: FC<{ name: string; value: any }> = ({ name, value }) => {
  const label = CONTENT_FIELD_LABELS[name] || name
  let body: React.ReactNode
  if (value == null || value === '') {
    body = <ReadonlyText value="" />
  } else if (isPlainObject(value) || Array.isArray(value)) {
    body = <CodeBlock value={JSON.stringify(value, null, 2)} />
  } else if (name === 'sql') {
    body = <CodeBlock value={String(value)} />
  } else if (LONG_TEXT_KEYS.has(name) || String(value).includes('\n') || String(value).length > 60) {
    body = <RichBlock value={String(value)} />
  } else {
    body = <ReadonlyText value={String(value)} />
  }
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ color: '#6b7a95', fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{label}</div>
      {body}
    </div>
  )
}

/** 步骤 content 主体：对象→按字段拆分；纯文本→富文本；数组/其它→代码块 */
const StepContent: FC<{ content: any }> = ({ content }) => {
  if (content == null || content === '') return <ReadonlyText value="" />
  let value: any = content
  if (typeof content === 'string') {
    const trimmed = content.trim()
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        value = JSON.parse(trimmed)
      } catch {
        return <RichBlock value={content} />
      }
    } else {
      return <RichBlock value={content} />
    }
  }
  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, any>).filter(([k]) => k !== 'chat_step' && k !== 'index')
    if (!entries.length) return <ReadonlyText value="" />
    return (
      <>
        {entries.map(([k, v]) => (
          <ContentField key={k} name={k} value={v} />
        ))}
      </>
    )
  }
  return <CodeBlock value={JSON.stringify(value, null, 2)} />
}

type AiStep = { chatMode?: string; chatStep?: string; content: any; index: number }

/** 解析 ai_response 为步骤数组；非数组结构返回 null，交由外层降级展示 */
const parseAiSteps = (raw?: string): AiStep[] | null => {
  if (!raw) return null
  const trimmed = raw.trim()
  if (!trimmed.startsWith('[')) return null
  let data: any
  try {
    data = JSON.parse(trimmed)
  } catch {
    return null
  }
  if (!Array.isArray(data) || !data.length) return null
  return data
    .map((item: any, i: number) => ({
      chatMode: item?.chat_mode,
      chatStep: item?.chat_step,
      content: item?.content,
      index: typeof item?.index === 'number' ? item.index : i,
    }))
    .sort((a, b) => a.index - b.index)
}

/** ai信息分步时间线：每步一张可展开卡片，默认展开最后一步 */
const AiStepTimeline: FC<{ steps: AiStep[] }> = ({ steps }) => {
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() => ({ [steps.length - 1]: true }))
  const toggle = (i: number) => setExpanded(prev => ({ ...prev, [i]: !prev[i] }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((step, i) => {
        const meta = getStepMeta(step.chatStep, step.chatMode)
        const isOpen = !!expanded[i]
        return (
          <div key={i} style={{ border: '1px solid rgba(130, 140, 200, 0.16)', borderRadius: 10, overflow: 'hidden' }}>
            <div
              onClick={() => toggle(i)}
              style={{ alignItems: 'center', background: 'rgba(130, 140, 200, 0.05)', cursor: 'pointer', display: 'flex', gap: 10, padding: '10px 12px', userSelect: 'none' }}
            >
              <span
                style={{
                  alignItems: 'center',
                  background: `linear-gradient(135deg, ${meta.color} 0%, ${meta.color}cc 100%)`,
                  borderRadius: '50%',
                  color: '#fff',
                  display: 'flex',
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: 600,
                  height: 22,
                  justifyContent: 'center',
                  width: 22,
                }}
              >
                {i + 1}
              </span>
              <span style={{ color: '#1a2744', fontSize: 14, fontWeight: 600 }}>{meta.label}</span>
              {step.chatStep ? (
                <Tag style={{ fontFamily: 'ui-monospace, Menlo, Consolas, monospace', fontSize: 11, marginInlineEnd: 0 }}>{step.chatStep.trim()}</Tag>
              ) : null}
              <span style={{ flex: 1 }} />
              <CaretRightOutlined style={{ color: '#8695ab', fontSize: 12, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>
            {isOpen ? (
              <div style={{ borderTop: '1px solid rgba(130, 140, 200, 0.12)', padding: 12 }}>
                <StepContent content={step.content} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

/** ai信息展示：数组步骤→分步时间线；其它结构→降级为格式化 JSON 块 */
const AiInfoView: FC<{ aiResponse?: string }> = ({ aiResponse }) => {
  const steps = parseAiSteps(aiResponse)
  if (steps && steps.length) return <AiStepTimeline steps={steps} />
  return <ReadonlyBlock value={formatMaybeJson(aiResponse)} />
}

const EffectReviewOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()

  // 抽屉打开前 handleEdit 已 setFieldsValue，直接用 getFieldValue 读取（useWatch 不读取未注册字段）
  const chatMode = form.getFieldValue('chat_mode')
  const question = form.getFieldValue('question')
  const aiResponse = form.getFieldValue('ai_response')
  const viewResponse = form.getFieldValue('view_response')
  const evalUser = form.getFieldValue('eval_user')
  const createBy = form.getFieldValue('create_by')
  const createTime = form.getFieldValue('create_time')

  // 模型评估（AI 评估）结果与请求态，抽屉每次打开时从表单值同步初始结果
  const [evalLoading, setEvalLoading] = useState(false)
  const [modelEval, setModelEval] = useState<{ evalLlm?: string; llmOpinion?: string }>({})

  useEffect(() => {
    if (open) {
      setModelEval({
        evalLlm: form.getFieldValue('eval_llm'),
        llmOpinion: form.getFieldValue('llm_opinion'),
      })
      setEvalLoading(false)
    }
  }, [open])

  // 模型评估仅问数场景（chat_with_db_execute）支持
  const isWenShuScene = (mode?: string) => mode === 'chat_with_db_execute'

  const handleClose = () => {
    onClose()
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      await handleSubmit({ ...values })
    } catch (err) {
      console.log(err)
    }
  }

  /** AI 评估：调用 llmeval 接口，成功后重新拉取详情取回模型评估结果并展示到下方结果栏 */
  const handleAiEval = async () => {
    const fbId = form.getFieldValue('fb_id')
    try {
      setEvalLoading(true)
      // 模型相关 id 固定：app_id=0、embed_model_id=6、chat_model_id=12（无需查询模型列表）
      const params = {
        context: {
          app_code: '',
          app_id: 0,
          chat_mode: chatMode,
          chat_model_id: 12,
          conv_uid: form.getFieldValue('conv_uid'),
          embed_model_id: 6,
          extra: { fb_id: fbId },
          space_id: `${form.getFieldValue('space_id')}`,
          sys_code: '1',
          user_name: '1',
        },
        enable_vis: false,
        incremental: false,
        messages: '',
        model: 'Qwen3.6-plus',
        stream: false,
      }
      const res: any = await fetchModelEval(params)
      if (res.response?.data?.success) {
        message.success('模型评估成功')
        // 优先使用 llmeval 接口直接返回的评估结果，避免二次查询详情时出现数据不一致或延迟
        const directData = res.response?.data?.data ?? res.data
        let nextEvalLlm = directData?.evalLlm ?? directData?.eval_llm
        let nextLlmOpinion = directData?.llmOpinion ?? directData?.llm_opinion

        // 若直接返回中无评估结果，再回调查看详情兜底
        if (nextEvalLlm == null) {
          const detailRes: any = await fetchMemoryDetail(fbId)
          const inner = detailRes?.data ?? detailRes?.response?.data?.data ?? {}
          const raw = Array.isArray(inner?.data) ? inner.data[0] : Array.isArray(inner) ? inner[0] : inner
          nextEvalLlm = raw?.evalLlm ?? raw?.eval_llm
          nextLlmOpinion = raw?.llmOpinion ?? raw?.llm_opinion
        }

        const evalLlmStr = nextEvalLlm != null ? `${nextEvalLlm}` : ''
        setModelEval({ evalLlm: evalLlmStr, llmOpinion: nextLlmOpinion ?? '' })
        form.setFieldsValue({ eval_llm: evalLlmStr, llm_opinion: nextLlmOpinion ?? '' })
      }
      // 失败提示（超时/后端错误）已由请求层统一弹出，此处不再重复提示，避免两条报错叠加
    } catch (error) {
      console.log(error)
    } finally {
      setEvalLoading(false)
    }
  }

  const chatModeLabel = MEMORY_CHAT_MODE_OPTIONS.find((item: any) => item.value === chatMode)?.label || '无'

  const renderEvalUser = () => {
    if (evalUser === '0') return <LikeFilled style={{ color: '#22c55e', fontSize: 16 }} />
    if (evalUser === '1') return <DislikeFilled style={{ color: '#f43f5e', fontSize: 16 }} />
    return '无'
  }

  const drawerTitle = operateType === 'add' ? '添加记录' : '人工评估'
  const drawerDesc = operateType === 'add' ? '新增一条效果评审记录' : '查看提交内容并完成专家评估'

  return (
    <CommonDrawer
      className="effect-review-drawer"
      description={drawerDesc}
      icon={<AuditOutlined />}
      open={open}
      size="large"
      title={drawerTitle}
      footer={
        <AFlex align="center" gap={12} justify="flex-end">
          <AButton onClick={handleClose}>{t('common.cancel')}</AButton>
          <AButton type="primary" onClick={submit}>
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      onClose={handleClose}
    >
      <AForm form={form} initialValues={{ eval_llm: '', llm_opinion: '' }} layout="vertical">
        <SectionTitle icon={<FileTextOutlined />} title="基本信息" color="#5b7cf7" />
        <AForm.Item label={fieldLabel('问题')}>
          <ReadonlyText value={question} />
        </AForm.Item>
        <AForm.Item label={fieldLabel('场景类型')}>
          <ReadonlyText value={chatModeLabel} />
        </AForm.Item>
        <AForm.Item label={fieldLabel('ai信息')}>
          <AiInfoView aiResponse={aiResponse} />
        </AForm.Item>
        <AForm.Item label={fieldLabel('view信息')}>
          <ReadonlyBlock value={viewResponse} />
        </AForm.Item>
        <AForm.Item label={fieldLabel('提交人')}>
          <ReadonlyText value={createBy} />
        </AForm.Item>
        <AForm.Item label={fieldLabel('提交意见')}>
          <ReadonlyText value={renderEvalUser()} />
        </AForm.Item>
        <AForm.Item label={fieldLabel('提交时间')}>
          <ReadonlyText value={createTime ? dayjs(createTime).format('YYYY-MM-DD HH:mm:ss') : '-'} />
        </AForm.Item>

        <SectionTitle
          icon={<RobotOutlined />}
          title="模型评估"
          color="#10b981"
          extra={
            operateType === 'add' ? undefined : (
              <ATooltip title={isWenShuScene(chatMode) ? '' : '仅问数场景支持模型评估'}>
                <AButton
                  ghost
                  disabled={evalLoading || !isWenShuScene(chatMode)}
                  icon={<ThunderboltOutlined />}
                  loading={evalLoading}
                  size="small"
                  type="primary"
                  onClick={handleAiEval}
                >
                  AI评估
                </AButton>
              </ATooltip>
            )
          }
        />
        {evalLoading ? (
          <div style={{ margin: '8px 0 20px', padding: '24px 0', textAlign: 'center' }}>
            <ASpin />
            <div style={{ color: '#a3b3c8', fontSize: 13, marginTop: 8 }}>模型评估中...</div>
          </div>
        ) : modelEval.evalLlm ? (
          <>
            <AForm.Item label={fieldLabel('结果')}>
              <ReadonlyText value={EVAL_LLM_OPTIONS.find((item: any) => item.value === modelEval.evalLlm)?.label || ''} />
            </AForm.Item>
            <AForm.Item label={fieldLabel('意见')}>
              <ReadonlyBlock value={modelEval.llmOpinion} />
            </AForm.Item>
          </>
        ) : (
          <AEmpty description="暂无模型评估结果" image={AEmpty.PRESENTED_IMAGE_SIMPLE} style={{ margin: '8px 0 20px' }} />
        )}

        <SectionTitle icon={<SolutionOutlined />} title="人工评估" color="#f59e0b" />
        <AForm.Item label={fieldLabel('审核状态')} name="status" rules={[{ required: true }]}>
          <ARadio.Group options={MEMORY_STATUS_OPTIONS} />
        </AForm.Item>
        <AForm.Item label={fieldLabel('专家评估')} name="eval_expert">
          <ARadio.Group options={EVAL_EXPERT_OPTIONS} />
        </AForm.Item>
        <AForm.Item label={fieldLabel('评估意见')} name="expert_opinion">
          <AInput.TextArea autoSize={{ maxRows: 6, minRows: 3 }} placeholder="请输入评估意见" />
        </AForm.Item>
        <AForm.Item label={fieldLabel('备注')} name="remark">
          <AInput.TextArea autoSize={{ maxRows: 6, minRows: 3 }} placeholder="请输入备注" />
        </AForm.Item>
      </AForm>
    </CommonDrawer>
  )
})

export default EffectReviewOperateDrawer
