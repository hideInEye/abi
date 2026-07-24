import { AuditOutlined, DislikeFilled, FileTextOutlined, LikeFilled, RobotOutlined, SolutionOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { EVAL_EXPERT_OPTIONS, EVAL_LLM_OPTIONS, MEMORY_CHAT_MODE_OPTIONS, MEMORY_STATUS_OPTIONS } from '@/constants/assistant-config'

type Props = Page.OperateDrawerProps

/** 分区标题 — 对齐平台抽屉风格（渐变图标 + 标题 + 底部分隔线） */
const SectionTitle: FC<{ icon: React.ReactNode; title: string; color?: string }> = ({ color = '#5b7cf7', icon, title }) => (
  <div
    style={{
      alignItems: 'center',
      borderBottom: '1px solid rgba(130, 140, 200, 0.10)',
      display: 'flex',
      gap: 10,
      marginBottom: 16,
      padding: '10px 0',
    }}
  >
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
  const evalLlm = form.getFieldValue('eval_llm')

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

  const chatModeLabel = MEMORY_CHAT_MODE_OPTIONS.find((item: any) => item.value === chatMode)?.label || '无'
  const evalLlmLabel = EVAL_LLM_OPTIONS.find((item: any) => item.value === evalLlm)?.label || ''

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
          <ReadonlyBlock value={aiResponse} />
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

        <SectionTitle icon={<RobotOutlined />} title="模型评估" color="#10b981" />
        {evalLlm ? (
          <>
            <AForm.Item label={fieldLabel('结果')}>
              <ReadonlyText value={evalLlmLabel} />
            </AForm.Item>
            <AForm.Item label={fieldLabel('意见')} name="llm_opinion">
              <AInput.TextArea readOnly autoSize={{ maxRows: 6, minRows: 2 }} variant="filled" />
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
