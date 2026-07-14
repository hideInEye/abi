import { DislikeOutlined, LikeOutlined } from '@ant-design/icons'
import { Form } from 'antd'
import dayjs from 'dayjs'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { EVAL_EXPERT_OPTIONS, EVAL_LLM_OPTIONS, MEMORY_CHAT_MODE_OPTIONS } from '@/constants/assistant-config'

type Props = Page.OperateDrawerProps

const EffectReviewOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()

  const manualVal = Form.useWatch('manual', form)

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

  return (
    <CommonDrawer
      open={open}
      size="large"
      title={operateType === 'add' ? '添加记录' : '人工评估'}
      footer={
        <AFlex justify="flex-end">
          <AButton onClick={handleClose}>{t('common.cancel')}</AButton>
          <AButton className="ml-2" type="primary" onClick={submit}>
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      onClose={handleClose}
    >
      <AForm form={form} initialValues={{ eval_llm: '无', llm_opinion: '无', manual: false }} layout="vertical">
        <div className="mb-2">
          <b>基本信息</b>
        </div>
        <AForm.Item label="问题" name="question">
          <AInput readOnly variant="borderless" />
        </AForm.Item>
        <AForm.Item label="场景类型" name="chat_mode">
          <span className="pl-4">{MEMORY_CHAT_MODE_OPTIONS.find((item: any) => item.value === form.getFieldValue('chat_mode'))?.label || '无'}</span>
        </AForm.Item>
        <AForm.Item label="ai信息" name="ai_response">
          <ACodemirror />
        </AForm.Item>
        <AForm.Item label="view信息" name="view_response">
          <AInput.TextArea readOnly rows={10} variant="borderless" />
        </AForm.Item>
        <AForm.Item label="提交人" name="create_by">
          <AInput readOnly variant="borderless" />
        </AForm.Item>
        <AForm.Item label="提交意见" name="eval_user">
          <span className="pl-4">
            {form.getFieldValue('eval_user') === '0' ? <LikeOutlined /> : form.getFieldValue('eval_user') === '1' ? <DislikeOutlined /> : '无'}
          </span>
        </AForm.Item>
        <AForm.Item label="提交时间" name="create_time">
          <span className="pl-4">{form.getFieldValue('create_time') ? dayjs(form.getFieldValue('create_time')).format('YYYY-MM-DD HH:mm:ss') : '-'}</span>
        </AForm.Item>

        <div className="mb-2">
          <b>模型评估</b>
        </div>
        {form.getFieldValue('eval_llm') ? (
          <>
            <AForm.Item label="结果" name="eval_llm">
              <span className="pl-4">{EVAL_LLM_OPTIONS.find((item: any) => item.value === form.getFieldValue('eval_llm'))?.label || ''}</span>
            </AForm.Item>
            <AForm.Item label="意见" name="llm_opinion">
              <AInput.TextArea readOnly variant="borderless" />
            </AForm.Item>
          </>
        ) : (
          <span className="mb-2 inline-block pl-4">无</span>
        )}

        <div className="mb-2">
          <b>人工评估</b>
        </div>
        <AForm.Item label="评估结果" name="status" rules={[{ required: true }]}>
          <ARadio.Group options={EVAL_EXPERT_OPTIONS} />
        </AForm.Item>
        <AForm.Item label="评估意见" name="expert_opinion">
          <AInput.TextArea />
        </AForm.Item>
        <AForm.Item label="人工调整" name="manual" valuePropName="checked">
          <ASwitch />
        </AForm.Item>
        {manualVal && (
          <AForm.Item label="ai信息" name="ai_response">
            <ACodemirror />
          </AForm.Item>
        )}
      </AForm>
    </CommonDrawer>
  )
})

export default EffectReviewOperateDrawer
