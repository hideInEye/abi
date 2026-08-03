import { AuditOutlined, DislikeFilled, FileTextOutlined, LikeFilled, RobotOutlined, SolutionOutlined, ThunderboltOutlined } from '@ant-design/icons'
import { message } from 'antd'
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
        // llmeval 接口不直接返回评估结果，需再查详情拿最新 evalLlm / llmOpinion
        const detailRes: any = await fetchMemoryDetail(fbId)
        const inner = detailRes?.data ?? detailRes?.response?.data?.data ?? {}
        const raw = Array.isArray(inner?.data) ? inner.data[0] : Array.isArray(inner) ? inner[0] : inner
        const nextEvalLlm = raw?.evalLlm ?? raw?.eval_llm
        const nextLlmOpinion = raw?.llmOpinion ?? raw?.llm_opinion
        const evalLlmStr = nextEvalLlm != null ? `${nextEvalLlm}` : ''
        setModelEval({ evalLlm: evalLlmStr, llmOpinion: nextLlmOpinion ?? '' })
        form.setFieldsValue({ eval_llm: evalLlmStr, llm_opinion: nextLlmOpinion ?? '' })
      } else {
        message.error(res.response?.data?.err_msg || '模型评估失败')
      }
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
          <ReadonlyBlock value={formatMaybeJson(aiResponse)} />
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
