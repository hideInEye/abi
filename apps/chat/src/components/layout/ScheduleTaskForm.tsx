import { Form, Input, message, Select } from 'antd'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'

import { ScheduleFormItems, ScheduleModeSegmented } from '@/components/schedule/schedule-fields'
import { addJobInfo, fetchJobGroupList, updateJobInfo } from '@/service/api/job'
import { getCurrentUserName } from '@/utils/layout'
import {
  buildCronPreview,
  describeScheduleForm,
  JOB_SCENE_OPTIONS,
  normalizeSchedulePoints,
  parseCronToScheduleValues,
  parseScheduleConf,
  parseTimeDayjs,
  PUSH_CHANNEL_OPTIONS,
} from '@/utils/job-schedule'

interface ScheduleTaskFormProps {
  // 宿主（抽屉）已解析的默认执行器 id，传入后不再重复拉执行器列表
  defaultJobGroup?: number | string
  initial?: any
  onClose: () => void
  onSuccess: () => void
}

// 分区标题：加粗深色标题 + 整行底部分隔线，清晰区分基础/调度/任务配置每一块；extra 可在标题右侧内联分段器（对齐管理端 SectionHeader）
const SectionHeader = ({ extra, title }: { extra?: React.ReactNode; title: string }) => (
  <div className="schedule-form-section">
    <span>{title}</span>
    {extra ? <div className="schedule-form-section-extra">{extra}</div> : null}
  </div>
)

// 无 GLUE IDE：运行模式固定 BEAN；调度默认连续任务每天执行（对齐管理端默认值）
const DEFAULT_VALUES = {
  interval: 1,
  points: [{ time: '08:00' }],
  scheduleType: 'CONTINUOUS',
  unit: 'DAY',
}

// 隐藏字段（执行器/负责人/运行模式/任务参数/高级配置）提交兜底，与管理端 ADVANCED_SUBMIT_DEFAULTS 一致
const HIDDEN_SUBMIT_DEFAULTS = {
  childJobId: '',
  executorBlockStrategy: 'SERIAL_EXECUTION',
  executorFailRetryCount: 0,
  executorRouteStrategy: 'FIRST',
  executorTimeout: 0,
  glueType: 'BEAN',
  misfireStrategy: 'DO_NOTHING',
}

// 结构化 scheduleConf 拆包进表单字段：日期/时刻串转 dayjs，空条目给默认值避免卡必填
function unpackStructuredConf(target: Record<string, any>, conf: Record<string, any>) {
  target.unit = conf.unit || 'DAY'
  target.execDate = conf.date ? dayjs(conf.date) : undefined
  target.execTime = conf.time ? parseTimeDayjs(conf.time) : undefined
  target.points = normalizeSchedulePoints(conf)
  target.minutes = Array.isArray(conf.minutes) ? conf.minutes : conf.minute !== undefined && conf.minute !== null && conf.minute !== '' ? [conf.minute] : undefined
  // 空条目兜底：小时默认第 0 分，其余周期默认单条 09:00，避免条目区空白直接卡必填
  if (target.unit === 'HOUR') {
    if (!Array.isArray(target.minutes) || !target.minutes.length) target.minutes = [0]
  } else if (!Array.isArray(target.points) || !target.points.length) {
    target.points = [{ time: '09:00' }]
  }
  target.weekDay = conf.weekDay
  target.interval = conf.interval ?? 1
  target.deadline = conf.deadline ? dayjs(conf.deadline) : undefined
}

export function ScheduleTaskForm({ defaultJobGroup, initial, onClose, onSuccess }: ScheduleTaskFormProps) {
  const [form] = Form.useForm()
  // 执行器不展示：默认通用执行器（优先宿主传入，否则拉列表取名称含「通用」者否则首个），仅参与提交
  const [jobGroup, setJobGroup] = useState<number | string | undefined>(initial?.jobGroup ?? defaultJobGroup)
  const [previewText, setPreviewText] = useState('')
  const scheduleType = Form.useWatch('scheduleType', form)
  const executorHandler = Form.useWatch('executorHandler', form)

  useEffect(() => {
    if (jobGroup !== undefined) return
    fetchJobGroupList({ pageNum: 1 })
      .then((res: any) => {
        const rows = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data?.records) ? res.data.records : []
        const general = rows.find((group: any) => String(group.name || '').includes('通用')) ?? rows[0]
        setJobGroup(general?.id)
      })
      .catch(() => undefined)
  }, [jobGroup])

  useEffect(() => {
    const initialValues: Record<string, any> = {
      ...DEFAULT_VALUES,
      alarmEmail: initial?.alarmEmail,
      executorHandler: initial?.executorHandler,
      executorParam: initial?.executorParam,
      name: initial?.name,
      pushChannels: typeof initial?.pushChannels === 'string' ? initial.pushChannels.split(',').filter(Boolean) : initial?.pushChannels,
    }
    // 调度中心只存 CRON：优先结构化 conf 回显，否则把 cron 反解析回三 tab 字段
    const { conf, mode } = parseScheduleConf(initial)
    if (mode === 'ONCE' || mode === 'CONTINUOUS' || mode === 'PERIODIC') {
      initialValues.scheduleType = mode
      unpackStructuredConf(initialValues, conf)
    } else {
      const parsed = parseCronToScheduleValues(initial?.scheduleConf)
      // 解析不了的管理端手写 cron：回落连续任务每天，由用户重选调度
      if (parsed) Object.assign(initialValues, parsed)
    }
    form.setFieldsValue(initialValues)
    setPreviewText(describeScheduleForm(initialValues.scheduleType, initialValues))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial])

  // 任务内容实时摘要：结构化模式给人读摘要
  const handleValuesChange = () => {
    setPreviewText(describeScheduleForm(form.getFieldValue('scheduleType'), form.getFieldsValue()))
  }

  const submit = async () => {
    let values: Record<string, any>
    try {
      values = await form.validateFields()
    } catch {
      return
    }
    if (jobGroup === undefined) {
      message.error('执行器列表加载失败，请稍后重试')
      return
    }
    const merged: Record<string, any> = { ...HIDDEN_SUBMIT_DEFAULTS, ...values }
    // 结构化字段仅用于 UI，提交统一转 CRON（截止日期等 cron 无对应语义不落库）
    const { deadline, execDate, execTime, interval, minutes, points, unit, weekDay, ...rest } = merged
    const cron = buildCronPreview(merged.scheduleType, merged)
    if (!cron) {
      message.error('当前调度配置无法转换为 cron 表达式（多时刻需分或时一致、按周间隔需为 1），请调整调度配置')
      return
    }
    const payload = {
      ...rest,
      // 负责人不展示：默认当前用户；任务参数不展示：与 chat 具体任务绑定，沿用原值
      author: getCurrentUserName(),
      executorParam: initial?.executorParam ?? '',
      jobGroup,
      pushChannels: Array.isArray(merged.pushChannels) ? merged.pushChannels.join(',') : merged.pushChannels || '',
      scheduleConf: cron,
      scheduleType: 'CRON',
      triggerStatus: Number(initial?.triggerStatus ?? 0),
    }
    const res: any = initial?.id ? await updateJobInfo(String(initial.id), payload) : await addJobInfo(payload)
    if (!(res?.code === 200 || res?.code === '200' || res?.success === true)) {
      message.error(res?.message || '保存失败')
      return
    }
    message.success('操作成功')
    onSuccess()
    onClose()
  }

  return (
    <div className="schedule-edit-panel">
      <Form form={form} labelCol={{ span: 6 }} wrapperCol={{ span: 18 }} onValuesChange={handleValuesChange}>
        <SectionHeader title="基础配置" />
        <Form.Item label="任务名称" name="name" rules={[{ required: true, message: '请输入任务名称' }]}>
          <Input placeholder="请输入任务名称" />
        </Form.Item>
        <Form.Item label="报警邮件" name="alarmEmail">
          <Input placeholder="请输入报警邮件，多个邮件地址则逗号分隔" />
        </Form.Item>

        <SectionHeader
          extra={
            <Form.Item className="mb-0" name="scheduleType" rules={[{ required: true, message: '请选择调度模式' }]}>
              <ScheduleModeSegmented />
            </Form.Item>
          }
          title="调度配置"
        />
        <ScheduleFormItems mode={scheduleType} />
        {previewText && (
          <Form.Item label="任务内容">
            <span style={{ color: '#1f2329' }}>{previewText}</span>
          </Form.Item>
        )}

        <SectionHeader title="任务配置" />
        <Form.Item label="作业场景" name="executorHandler" rules={[{ required: true, message: '请选择作业场景' }]}>
          <Select options={JOB_SCENE_OPTIONS} placeholder="请选择作业场景" />
        </Form.Item>
        {executorHandler === 'channelPush' && (
          <Form.Item label="推送渠道" name="pushChannels" rules={[{ required: true, message: '请选择推送渠道' }]}>
            <Select mode="multiple" options={PUSH_CHANNEL_OPTIONS} placeholder="请选择推送渠道" />
          </Form.Item>
        )}
      </Form>
      <div className="schedule-edit-actions">
        <button type="button" className="schedule-edit-cancel" onClick={onClose}>
          取消
        </button>
        <button type="button" className="schedule-edit-save" onClick={submit}>
          保存
        </button>
      </div>
    </div>
  )
}
