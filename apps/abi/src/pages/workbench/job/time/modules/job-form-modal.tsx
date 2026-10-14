import { CloseOutlined, DownOutlined, FieldTimeOutlined, PlusOutlined, RightOutlined } from '@ant-design/icons'
import { Cascader, Segmented, message } from 'antd'
import dayjs from 'dayjs'

import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import {
  BLOCK_STRATEGY_OPTIONS,
  JOB_SCENE_OPTIONS,
  MISFIRE_STRATEGY_OPTIONS,
  PUSH_CHANNEL_OPTIONS,
  REPEAT_UNIT_OPTIONS,
  ROUTE_STRATEGY_OPTIONS,
  SCHEDULE_MODE_OPTIONS,
  WEEK_DAY_OPTIONS,
} from '@/constants/job'
import { addJobInfo, updateJobInfo } from '@/service/api/job'
import { getSpaceId } from '@/store/slice/app'
import { buildCronPreview, describeScheduleForm, isJobRequestSuccess, normalizeSchedulePoints, parseScheduleConf } from '../../utils'

import CronExpressionDrawer from './cron-expression-drawer'

export type JobFormOperateType = 'add' | 'copy' | 'edit'

interface Props {
  initial?: any
  jobGroupOptions: { label: string; value: number | string }[]
  onClose: () => void
  onSuccess: () => void
  open: boolean
  operateType: JobFormOperateType
}

// 分区标题：加粗深色标题 + 整行底部分隔线，清晰区分基础/调度/任务配置每一块；extra 可在标题右侧内联分段器，预留 24px 间距不贴死
const SectionHeader: FC<{ extra?: React.ReactNode; title: string }> = ({ extra, title }) => (
  <div className="flex items-center" style={{ borderBottom: '1px solid #f0f0f1', margin: '4px 0 20px', paddingBottom: 10 }}>
    <span style={{ color: '#1f2329', fontSize: 14, fontWeight: 600 }}>{title}</span>
    {extra ? <div className="ml-6">{extra}</div> : null}
  </div>
)

// 调度模式分段选择器：antd Segmented 胶囊样式（.abi-seg 统一定制：灰底轨道、选中白块+品牌蓝字）
const ScheduleModeCards: FC<{ onChange?: (value: string) => void; value?: string }> = ({ onChange, value }) => (
  <Segmented className="abi-seg" onChange={(next) => onChange?.(String(next))} options={SCHEDULE_MODE_OPTIONS} value={value} />
)

const WEEK_DAY_SHORT: Record<string, string> = { FRI: '五', MON: '一', SAT: '六', SUN: '日', THU: '四', TUE: '二', WED: '三' }

// 星期圆形选择器（单选）
const WeekDayCircles: FC<{ onChange?: (value: string) => void; value?: string }> = ({ onChange, value }) => (
  <div className="flex gap-2">
    {WEEK_DAY_OPTIONS.map((option) => {
      const active = option.value === value
      return (
        <button
          key={option.value}
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-solid text-sm"
          style={active ? { background: '#eef4ff', borderColor: '#3b5bfd', color: '#3b5bfd' } : { background: '#fff', borderColor: '#e5e6eb', color: '#1f2329' }}
          onClick={() => onChange?.(option.value)}
        >
          {WEEK_DAY_SHORT[option.value]}
        </button>
      )
    })}
  </div>
)

const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => ({ label: `${index + 1}号`, value: index + 1 }))
const YEAR_DATE_OPTIONS = Array.from({ length: 12 }, (_, month) => Array.from({ length: 31 }, (_, day) => ({ label: `${month + 1}月${day + 1}日`, value: `${month + 1}-${day + 1}` }))).flat()

// 执行条目编辑器：天=时刻，月/年=日期+时刻一对；支持添加/删除多条
const SchedulePointsEditor: FC<{ onChange?: (next: any[]) => void; unit?: string; value?: any[] }> = ({ onChange, unit, value }) => {
  const list = Array.isArray(value) && value.length ? value : []
  const update = (index: number, patch: Record<string, any>) => onChange?.(list.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const remove = (index: number) => onChange?.(list.filter((_, i) => i !== index))
  const add = () => onChange?.([...list, unit === 'MONTH' ? { day: 1, time: '09:00' } : unit === 'YEAR' ? { date: '1-1', time: '09:00' } : { time: '09:00' }])
  // 对齐千问：每个执行时刻渲染为紧凑块（无边框选择器 + ✕ 删除），末尾 [+] 方块按钮新增，横向自动换行
  return (
    <div className="flex flex-wrap items-center gap-2">
      {list.map((point, index) => (
        <div key={index} className="flex items-center rounded-md border border-solid" style={{ background: '#fff', borderColor: '#e5e6eb' }}>
          {unit === 'MONTH' && <ASelect className="w-24" options={MONTH_DAY_OPTIONS} value={point.day} variant="borderless" onChange={(next) => update(index, { day: next })} />}
          {unit === 'YEAR' && <ASelect className="w-28" options={YEAR_DATE_OPTIONS} value={point.date} variant="borderless" onChange={(next) => update(index, { date: next })} />}
          <ATimePicker
            format="HH:mm"
            popupClassName="abi-time-panel"
            suffixIcon={null}
            value={point.time ? dayjs(point.time, 'HH:mm') : null}
            variant="borderless"
            onChange={(next) => update(index, { time: next ? next.format('HH:mm') : point.time })}
          />
          <CloseOutlined style={{ color: '#8a94a6', cursor: 'pointer', fontSize: 12, margin: '0 8px' }} onClick={() => remove(index)} />
        </div>
      ))}
      <AButton icon={<PlusOutlined />} onClick={add} />
    </div>
  )
}

// 小时模式执行分钟：单选某一分，存为单元素数组以复用 cron 的 singleValue 转换
const HOUR_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => ({ label: `${String(index).padStart(2, '0')}分`, value: index }))

const ScheduleMinuteSelect: FC<{ onChange?: (next: number[]) => void; value?: number[] }> = ({ onChange, value }) => (
  <ASelect
    className="w-full"
    onChange={(next) => onChange?.([next])}
    options={HOUR_MINUTE_OPTIONS}
    placeholder="请选择执行分钟"
    value={Array.isArray(value) ? value[0] : undefined}
  />
)

// 周模式单一执行时刻：满宽单个时间选择器（无新增/删除），仍存 points=[{time}] 以复用 cron 转换
const ScheduleSingleTime: FC<{ onChange?: (next: any[]) => void; value?: any[] }> = ({ onChange, value }) => {
  const time = Array.isArray(value) && value.length ? value[0]?.time : undefined
  return (
    <ATimePicker
      className="w-full"
      format="HH:mm"
      popupClassName="abi-time-panel"
      value={time ? dayjs(time, 'HH:mm') : null}
      onChange={(next) => onChange?.([{ time: next ? next.format('HH:mm') : '' }])}
    />
  )
}  

// 月模式日期选择：千问式 7 列日历方格弹层（替代默认下拉列表），触发框沿用 select 外观
const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

const MonthDayGridPicker: FC<{ onChange?: (next: number) => void; value?: number }> = ({ onChange, value }) => {
  const [open, setOpen] = useState(false)
  return (
    <APopover
      arrow={false}
      content={
        <div className="abi-day-grid">
          {MONTH_DAYS.map((day) => (
            <div
              className={day === value ? 'abi-day-cell is-active' : 'abi-day-cell'}
              key={day}
              onClick={() => {
                onChange?.(day)
                setOpen(false)
              }}
            >
              {day}
            </div>
          ))}
        </div>
      }
      open={open}
      placement="bottomLeft"
      trigger="click"
      onOpenChange={setOpen}
    >
      <div className="flex w-full cursor-pointer items-center justify-between rounded-md border border-solid" style={{ height: 32, padding: '0 11px', borderColor: '#d9d9d9', background: '#fff' }}>
        <span style={{ color: value ? '#1f2329' : '#bfbfbf', fontSize: 14 }}>{value ? `${value}号` : '请选择日期'}</span>
        <DownOutlined style={{ color: '#bfbfbf', fontSize: 11 }} />
      </div>
    </APopover>
  )
}

// 月模式单一执行时刻：日期选择 + 时间选择器并排满宽（无新增/删除），存 points=[{day,time}] 以复用 cron 转换
const ScheduleMonthTime: FC<{ onChange?: (next: any[]) => void; value?: any[] }> = ({ onChange, value }) => {
  const point = Array.isArray(value) && value.length ? value[0] : {}
  return (
    <div className="flex w-full gap-2">
      <div className="flex-1">
        <MonthDayGridPicker value={point.day} onChange={(next) => onChange?.([{ ...point, day: next }])} />
      </div>
      <ATimePicker
        className="flex-1"
        format="HH:mm"
        popupClassName="abi-time-panel"
        value={point.time ? dayjs(point.time, 'HH:mm') : null}
        onChange={(next) => onChange?.([{ ...point, time: next ? next.format('HH:mm') : '' }])}
      />
    </div>
  )
}

// 年模式日期选择：原生 Cascader 两列（左月右日），选中高亮/字号/圆角走 antd 默认，与输入框风格统一；值存 "M-D" 字符串
const YEAR_CASCADER_OPTIONS = Array.from({ length: 12 }, (_month, monthIdx) => ({
  children: Array.from({ length: 31 }, (_day, dayIdx) => ({ label: `${dayIdx + 1}日`, value: dayIdx + 1 })),
  label: `${monthIdx + 1}月`,
  value: monthIdx + 1,
}))

const MonthDayCascader: FC<{ onChange?: (next: string) => void; value?: string }> = ({ onChange, value }) => {
  const [monthPart, dayPart] = (value || '').split('-')
  const month = Number(monthPart)
  const day = Number(dayPart)
  return (
    <Cascader
      className="w-full"
      displayRender={(labels) => `${labels[0]}${labels[1]}`}
      expandIcon={<span />}
      expandTrigger="hover"
      options={YEAR_CASCADER_OPTIONS}
      placeholder="请选择日期"
      popupClassName="abi-md-panel"
      value={month && day ? [month, day] : undefined}
      onChange={(next) => onChange?.(next && next.length === 2 ? `${next[0]}-${next[1]}` : '')}
    />
  )
}

// 年模式：顶部单个日期（月日级联）+ 下方多时刻（纯时间 chip），所有时刻共享同一日期，存 points=[{date,time}]
const ScheduleYearTime: FC<{ onChange?: (next: any[]) => void; value?: any[] }> = ({ onChange, value }) => {
  const list = Array.isArray(value) && value.length ? value : [{ date: '1-1', time: '09:00' }]
  const date = list[0]?.date
  const setDate = (next: string) => onChange?.(list.map(point => ({ ...point, date: next })))
  const updateTime = (index: number, next: string) => onChange?.(list.map((point, i) => (i === index ? { ...point, time: next } : point)))
  const removeAt = (index: number) => onChange?.(list.filter((_, i) => i !== index))
  const addTime = () => onChange?.([...list, { date, time: '09:00' }])
  return (
    <div className="flex w-full flex-col gap-2">
      <MonthDayCascader onChange={setDate} value={date} />
      <div className="flex flex-wrap items-center gap-2">
        {list.map((point, index) => (
          <div className="flex items-center rounded-md border border-solid" key={index} style={{ background: '#fff', borderColor: '#e5e6eb' }}>
            <ATimePicker
              format="HH:mm"
              popupClassName="abi-time-panel"
              suffixIcon={null}
              value={point.time ? dayjs(point.time, 'HH:mm') : null}
              variant="borderless"
              onChange={(next) => updateTime(index, next ? next.format('HH:mm') : point.time)}
            />
            <CloseOutlined style={{ color: '#8a94a6', cursor: 'pointer', fontSize: 12, margin: '0 8px' }} onClick={() => removeAt(index)} />
          </div>
        ))}
        <AButton icon={<PlusOutlined />} onClick={addTime} />
      </div>
    </div>
  )
}

// 无 GLUE IDE：运行模式固定 BEAN；调度默认连续任务每天执行
const DEFAULT_VALUES = {
  childJobId: '',
  executorBlockStrategy: 'SERIAL_EXECUTION',
  executorFailRetryCount: 0,
  executorParam: '',
  executorRouteStrategy: 'FIRST',
  executorTimeout: 0,
  glueType: 'BEAN',
  interval: 1,
  misfireStrategy: 'DO_NOTHING',
  scheduleType: 'CONTINUOUS',
  points: [{ time: '08:00' }],
  unit: 'DAY',
}

// 高级配置折叠时字段未注册，validateFields 不会返回其值；提交用与展开态一致的默认值兜底，避免后端必填策略字段缺失
const ADVANCED_SUBMIT_DEFAULTS = {
  childJobId: '',
  executorBlockStrategy: 'SERIAL_EXECUTION',
  executorFailRetryCount: 0,
  executorParam: '',
  executorRouteStrategy: 'FIRST',
  executorTimeout: 0,
  glueType: 'BEAN',
  misfireStrategy: 'DO_NOTHING',
}

// 结构化 scheduleConf 拆包进表单字段：日期/时刻串转 dayjs，空条目给默认值避免卡必填
function unpackStructuredConf(target: Record<string, any>, conf: Record<string, any>) {
  target.unit = conf.unit || 'DAY'
  target.execDate = conf.date ? dayjs(conf.date) : undefined
  target.execTime = conf.time ? dayjs(conf.time, 'HH:mm') : undefined
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

const JobFormModal: FC<Props> = memo(({ initial, jobGroupOptions, onClose, onSuccess, open, operateType }) => {
  const [form] = AForm.useForm()
  const spaceId = useAppSelector(getSpaceId)
  const [cronVisible, setCronVisible] = useState(false)
  // 高级配置默认折叠
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const [previewText, setPreviewText] = useState('')
  const scheduleType = AForm.useWatch('scheduleType', form)
  const repeatUnit = AForm.useWatch('unit', form)
  const executorHandler = AForm.useWatch('executorHandler', form)

  // 任务内容实时摘要：结构化模式给人读摘要，自定义给 cron 原文
  const computePreview = (values: any) => {
    if (values?.scheduleType === 'CUSTOM') return values.scheduleConf ? String(values.scheduleConf) : ''
    return describeScheduleForm(values?.scheduleType, values || {})
  }

  // 切换重复周期时把执行条目归一成新周期形状（月/年带日期、天/周仅时刻），避免旧周期字段残留进 conf；setFieldsValue 不触发 onValuesChange，故随后手动重算预览
  const handleScheduleValuesChange = (changed: Record<string, any>) => {
    if (changed.unit) {
      const values = form.getFieldsValue()
      if (changed.unit === 'HOUR') {
        if (!Array.isArray(values.minutes) || !values.minutes.length) form.setFieldsValue({ minutes: [0] })
      } else {
        const points = (Array.isArray(values.points) ? values.points : []).map((point: any) => {
          const time = point?.time || '09:00'
          if (changed.unit === 'MONTH') return { day: point?.day ?? 1, time }
          if (changed.unit === 'YEAR') return { date: point?.date || '1-1', time }
          return { time }
        })
        form.setFieldsValue({ points: points.length ? points : [{ time: '09:00' }] })
      }
    }
    setPreviewText(computePreview(form.getFieldsValue()))
  }

  useEffect(() => {
    if (!open) return
    setAdvancedOpen(false)
    form.resetFields()
    const initialValues: Record<string, any> = { ...DEFAULT_VALUES, ...(initial || {}) }
    // 新模式 scheduleConf 为结构化 JSON：拆成表单字段；真实后端只存 CRON，回显到自定义 Cron 卡片
    const { conf, mode } = parseScheduleConf(initial)
    if (mode === 'CRON') {
      initialValues.scheduleType = 'CUSTOM'
    } else if (mode === 'ONCE' || mode === 'CONTINUOUS' || mode === 'PERIODIC') {
      initialValues.scheduleType = mode
      unpackStructuredConf(initialValues, conf)
    }
    if (typeof initialValues.pushChannels === 'string') initialValues.pushChannels = initialValues.pushChannels.split(',').filter(Boolean)
    form.setFieldsValue(initialValues)
    setPreviewText(computePreview(initialValues))
  }, [open, initial])

  // 展开高级配置后自动触底，避免新增内容在视口外需要手动下滑；抽屉滚动容器是 .ant-drawer-body
  useEffect(() => {
    if (!advancedOpen) return
    requestAnimationFrame(() => {
      const el = bodyScrollRef.current
      const scroller = (el?.closest('.ant-drawer-body') ?? el) as HTMLElement | null
      if (scroller) scroller.scrollTo({ behavior: 'smooth', top: scroller.scrollHeight })
    })
  }, [advancedOpen])

  const handleCloseCronExpression = (val?: string) => {
    if (val) {
      form.setFieldValue('scheduleConf', val)
    }
    setCronVisible(false)
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      // 后端 scheduleType 仅认 XXL-JOB 枚举：提交统一转成 CRON + cron 串；结构化字段仅用于 UI，截止日期等 cron 无对应语义不落库
      const merged = { ...ADVANCED_SUBMIT_DEFAULTS, ...values }
      const { deadline, execDate, execTime, interval, minutes, points, unit, weekDay, ...rest } = merged
      const cron = merged.scheduleType === 'CUSTOM' ? String(merged.scheduleConf ?? '').trim() : buildCronPreview(merged.scheduleType, merged)
      if (!cron) {
        message.error('当前调度配置无法转换为 cron 表达式（多时刻需分或时一致、按周间隔需为 1），请调整调度配置或改用自定义 Cron')
        return
      }
      const payload = {
        ...rest,
        executorFailRetryCount: Number(merged.executorFailRetryCount ?? 0),
        executorTimeout: Number(merged.executorTimeout ?? 0),
        glueType: 'BEAN',
        pushChannels: Array.isArray(merged.pushChannels) ? merged.pushChannels.join(',') : merged.pushChannels || '',
        scheduleConf: cron,
        scheduleType: 'CRON',
        triggerStatus: Number(initial?.triggerStatus ?? 0),
      }
      const res: any = operateType === 'edit'
        ? await updateJobInfo(String(initial?.id), payload)
        : await addJobInfo({ ...payload, spaceId })
      if (!isJobRequestSuccess(res)) return
      message.success('操作成功')
      onSuccess()
      onClose()
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <>
      <CommonDrawer
        footer={
          <AFlex justify="flex-end">
            <AButton onClick={onClose}>取消</AButton>
            <AButton className="mx-2" type="primary" onClick={submit}>
              保存
            </AButton>
          </AFlex>
        }
        onClose={onClose}
        open={open}
        title={operateType === 'edit' ? '编辑 任务' : '新增 任务'}
        width={800}
      >
        <div ref={bodyScrollRef} className="pb-2">
          <AForm form={form} labelCol={{ span: 8 }} wrapperCol={{ span: 16 }} onValuesChange={handleScheduleValuesChange}>
            <SectionHeader title="基础配置" />
            <div className="grid grid-cols-2 gap-x-4">
              <AForm.Item label="执行器" name="jobGroup" rules={[{ required: true, message: '请选择执行器' }]}>
                <ASelect options={jobGroupOptions} placeholder="请选择执行器" />
              </AForm.Item>
              <AForm.Item label="任务名称" name="name" rules={[{ required: true, message: '请输入任务名称' }]}>
                <AInput placeholder="请输入任务名称" />
              </AForm.Item>
              <AForm.Item label="负责人" name="author" rules={[{ required: true, message: '请输入负责人' }]}>
                <AInput placeholder="请输入负责人" />
              </AForm.Item>
              <AForm.Item label="报警邮件" name="alarmEmail">
                <AInput placeholder="请输入报警邮件，多个邮件地址则逗号分隔" />
              </AForm.Item>
            </div>

            <SectionHeader
              extra={
                <AForm.Item className="mb-0" name="scheduleType" rules={[{ required: true, message: '请选择调度模式' }]}>
                  <ScheduleModeCards />
                </AForm.Item>
              }
              title="调度配置"
            />
            {scheduleType === 'ONCE' && (
              <>
                <AForm.Item label="执行日期" labelCol={{ span: 4 }} name="execDate" rules={[{ required: true, message: '请选择执行日期' }]} wrapperCol={{ span: 20 }}>
                  <ADatePicker className="w-full" />
                </AForm.Item>
                <AForm.Item label="执行时间" labelCol={{ span: 4 }} name="execTime" rules={[{ required: true, message: '请选择执行时间' }]} wrapperCol={{ span: 20 }}>
                  <ATimePicker className="w-full" format="HH:mm" popupClassName="abi-time-panel" />
                </AForm.Item>
              </>
            )}
            {(scheduleType === 'CONTINUOUS' || scheduleType === 'PERIODIC') && (
              <>
                <AForm.Item label="重复周期" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                  <div className="flex gap-2">
                    {scheduleType === 'PERIODIC' && (
                      <AForm.Item className="mb-0 flex-1" labelCol={{ span: 0 }} name="interval" rules={[{ required: true, message: '请输入重复间隔' }]} wrapperCol={{ span: 24 }}>
                        <AInputNumber addonAfter="个周期" className="w-full" min={1} />
                      </AForm.Item>
                    )}
                    <AForm.Item className="mb-0 flex-1" labelCol={{ span: 0 }} name="unit" rules={[{ required: true, message: '请选择重复周期' }]} wrapperCol={{ span: 24 }}>
                      <ASelect options={REPEAT_UNIT_OPTIONS} />
                    </AForm.Item>
                  </div>
                </AForm.Item>
                <AForm.Item label="执行时间" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                  <div className="flex flex-col gap-2">
                    {repeatUnit === 'WEEK' && (
                      <AForm.Item className="mb-0" labelCol={{ span: 0 }} name="weekDay" rules={[{ required: true, message: '请选择星期' }]} wrapperCol={{ span: 24 }}>
                        <WeekDayCircles />
                      </AForm.Item>
                    )}
                    {repeatUnit === 'HOUR' ? (
                      <AForm.Item className="mb-0" labelCol={{ span: 0 }} name="minutes" rules={[{ required: true, type: 'array', message: '请选择执行分钟' }]} wrapperCol={{ span: 24 }}>
                        <ScheduleMinuteSelect />
                      </AForm.Item>
                    ) : repeatUnit === 'WEEK' ? (
                      <AForm.Item className="mb-0" labelCol={{ span: 0 }} name="points" rules={[{ required: true, type: 'array', message: '请选择执行时间' }]} wrapperCol={{ span: 24 }}>
                        <ScheduleSingleTime />
                      </AForm.Item>
                    ) : repeatUnit === 'MONTH' ? (
                      <AForm.Item className="mb-0" labelCol={{ span: 0 }} name="points" rules={[{ required: true, type: 'array', message: '请选择执行时间' }]} wrapperCol={{ span: 24 }}>
                        <ScheduleMonthTime />
                      </AForm.Item>
                    ) : repeatUnit === 'YEAR' ? (
                      <AForm.Item className="mb-0" labelCol={{ span: 0 }} name="points" rules={[{ required: true, type: 'array', message: '请添加执行时间' }]} wrapperCol={{ span: 24 }}>
                        <ScheduleYearTime />
                      </AForm.Item>
                    ) : (
                      <AForm.Item className="mb-0" labelCol={{ span: 0 }} name="points" rules={[{ required: true, type: 'array', message: '请添加执行时间' }]} wrapperCol={{ span: 24 }}>
                        <SchedulePointsEditor unit={repeatUnit} />
                      </AForm.Item>
                    )}
                  </div>
                </AForm.Item>
                {scheduleType === 'PERIODIC' && (
                  <AForm.Item label="截止日期" labelCol={{ span: 4 }} name="deadline" rules={[{ required: true, message: '请选择截止日期' }]} wrapperCol={{ span: 20 }}>
                    <ADatePicker className="w-full" />
                  </AForm.Item>
                )}
              </>
            )}
            {scheduleType === 'CUSTOM' && (
              <AForm.Item label="Cron" labelCol={{ span: 4 }} name="scheduleConf" rules={[{ required: true, message: '请输入cron执行表达式' }]} wrapperCol={{ span: 20 }}>
                <AInput
                  addonAfter={
                    <AButton icon={<FieldTimeOutlined />} type="link" onClick={() => setCronVisible(true)}>
                      生成表达式
                    </AButton>
                  }
                  placeholder="请输入cron执行表达式"
                />
              </AForm.Item>
            )}
            {previewText && (
              <AForm.Item label="任务内容" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                <span style={{ color: '#1f2329' }}>{previewText}</span>
              </AForm.Item>
            )}

            <SectionHeader
              extra={
                <Segmented
                  className="abi-seg"
                  onChange={() => message.info('功能开发中...')}
                  options={[{ label: '对象', value: 'object' }, { label: '脚本', value: 'script' }]}
                  value="object"
                />
              }
              title="任务配置"
            />
            <div className="grid grid-cols-2 gap-x-4">
              <AForm.Item label="作业场景" name="executorHandler" rules={[{ required: true, message: '请选择作业场景' }]}>
                <ASelect options={JOB_SCENE_OPTIONS} placeholder="请选择作业场景" />
              </AForm.Item>
              {executorHandler === 'channelPush' && (
                <AForm.Item label="推送渠道" name="pushChannels" rules={[{ required: true, message: '请选择推送渠道' }]} className="col-span-2" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }}>
                  <ASelect mode="multiple" options={PUSH_CHANNEL_OPTIONS} placeholder="请选择推送渠道" />
                </AForm.Item>
              )}
              <AForm.Item label="任务参数" name="executorParam" labelCol={{ span: 4 }} wrapperCol={{ span: 20 }} className="col-span-2">
                <AInput.TextArea placeholder="请输入任务参数" rows={3} />
              </AForm.Item>
            </div>

            <div className="cursor-pointer select-none" style={{ color: '#8a94a6', fontSize: 13, margin: '2px 0 12px' }} onClick={() => setAdvancedOpen((value) => !value)}>
              高级配置 {advancedOpen ? <DownOutlined style={{ fontSize: 10 }} /> : <RightOutlined style={{ fontSize: 10 }} />}
            </div>
            {advancedOpen && (
              <div className="grid grid-cols-2 gap-x-4">
                <AForm.Item label="路由策略" name="executorRouteStrategy">
                  <ASelect options={ROUTE_STRATEGY_OPTIONS} />
                </AForm.Item>
                <AForm.Item label="子任务ID" name="childJobId">
                  <AInput placeholder="请输入子任务的任务ID,如存在多个则逗号分隔" />
                </AForm.Item>
                <AForm.Item label="调度过期策略" name="misfireStrategy">
                  <ASelect options={MISFIRE_STRATEGY_OPTIONS} />
                </AForm.Item>
                <AForm.Item label="阻塞处理策略" name="executorBlockStrategy">
                  <ASelect options={BLOCK_STRATEGY_OPTIONS} />
                </AForm.Item>
                <AForm.Item label="任务超时时间" name="executorTimeout">
                  <AInputNumber addonAfter="秒" className="w-full" min={0} placeholder="0 表示不限制" />
                </AForm.Item>
                <AForm.Item label="失败重试次数" name="executorFailRetryCount">
                  <AInputNumber className="w-full" max={10} min={0} />
                </AForm.Item>
              </div>
            )}
          </AForm>
        </div>
      </CommonDrawer>

      {cronVisible && <CronExpressionDrawer onClose={handleCloseCronExpression} />}
    </>
  )
})

export default JobFormModal
