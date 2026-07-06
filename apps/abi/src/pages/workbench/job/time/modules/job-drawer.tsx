import { FieldTimeOutlined, QuestionCircleOutlined } from '@ant-design/icons'

import { CONCURRENT_TYPE_OPTIONS, JOB_GROUP_OPTIONS, JOB_STATUS_OPTIONS, STRATEGY_TYPE_OPTIONS } from '@/constants/job'

import CronExpressionDrawer from './cron-expression-drawer'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

type Props = Page.OperateDrawerProps

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()
  // const sourceFileVal = AForm.useWatch('sourceFile', form);
  const [visible, setVisible] = useState(false)
  const handleCronExpression = () => {
    setVisible(true)
  }

  const handleClose = () => {
    onClose()
  }

  const handleCloseCronExpression = (val?: string) => {
    if (val) {
      form.setFieldValue('cronExpression', val)
    }
    setVisible(false)
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      await handleSubmit(values)
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <CommonDrawer
      open={open}
      size="large"
      title={operateType === 'add' ? '添加任务' : '编辑任务'}
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
      <AForm form={form} initialValues={{ concurrent: '1', misfirePolicy: '1' }} layout="vertical">
        <AForm.Item label="任务名称" name="jobName" rules={[{ required: true }]}>
          <AInput placeholder="请输入任务名称" />
        </AForm.Item>
        <AForm.Item
          label="任务分组"
          name="jobGroup"
          // rules={[{ required: true }]}
        >
          <ASelect options={JOB_GROUP_OPTIONS} placeholder="请选择任务分组" />
        </AForm.Item>
        <AForm.Item
          name="invokeTarget"
          rules={[{ required: true }]}
          label={
            <>
              <span className="mr-2">调用方法</span>
              <ATooltip
                title={
                  <div>
                    <div>Bean调用示例：ryTask.ryParams(&apos;ry&apos;)</div>
                    <div>Class类调用示例：com.ruoyi.quartz.task.RyTask.ryParams(&apos;ry&apos;)</div>
                    <div>参数说明：支持字符串，布尔类型，长整型，浮点型，整型</div>
                  </div>
                }
              >
                <QuestionCircleOutlined />
              </ATooltip>
            </>
          }
        >
          <AInput placeholder="请输入调用目标字符串" />
        </AForm.Item>
        <AForm.Item label="cron表达式" name="cronExpression" rules={[{ required: true }]}>
          <AInput
            placeholder="请输入cron执行表达式"
            addonAfter={
              <AButton icon={<FieldTimeOutlined />} type="link" onClick={handleCronExpression}>
                生成表达式
              </AButton>
            }
          />
        </AForm.Item>
        {operateType === 'edit' && (
          <AForm.Item label="状态" name="status" rules={[{ required: true }]}>
            <ARadio.Group options={JOB_STATUS_OPTIONS} />
          </AForm.Item>
        )}

        <AForm.Item label="执行策略" name="misfirePolicy" rules={[{ required: true }]}>
          <ARadio.Group options={STRATEGY_TYPE_OPTIONS} />
        </AForm.Item>
        <AForm.Item label="是否并发" name="concurrent" rules={[{ required: true }]}>
          <ARadio.Group options={CONCURRENT_TYPE_OPTIONS} />
        </AForm.Item>
      </AForm>

      {visible && <CronExpressionDrawer onClose={handleCloseCronExpression} />}
    </CommonDrawer>
  )
})

export default DatasourceOperateDrawer
