import { CloseOutlined, DownOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Cascader, DatePicker, Form, InputNumber, Popover, Segmented, Select, TimePicker } from 'antd'
import { useEffect, useState } from 'react'

import { CHAT_SCHEDULE_MODE_OPTIONS, parseTimeDayjs, REPEAT_UNIT_OPTIONS, WEEK_DAY_OPTIONS } from '@/utils/job-schedule'

// 调度模式分段选择器：管理端 .abi-seg 胶囊样式（chat 侧类名 schedule-seg），仅单次/连续/定期三个 tab
export const ScheduleModeSegmented = (props: Omit<React.ComponentProps<typeof Segmented>, 'options'>) => (
  <Segmented className="schedule-seg" options={CHAT_SCHEDULE_MODE_OPTIONS} {...props} />
)

const WEEK_DAY_SHORT: Record<string, string> = { FRI: '五', MON: '一', SAT: '六', SUN: '日', THU: '四', TUE: '二', WED: '三' }

// 星期圆形选择器（单选）
const WeekDayCircles = ({ onChange, value }: { onChange?: (value: string) => void; value?: string }) => (
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

// 小时模式执行分钟：单选某一分，存为单元素数组以复用 cron 的 singleValue 转换
const HOUR_MINUTE_OPTIONS = Array.from({ length: 60 }, (_, index) => ({ label: `${String(index).padStart(2, '0')}分`, value: index }))
const MONTH_DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => ({ label: `${index + 1}号`, value: index + 1 }))
const YEAR_DATE_OPTIONS = Array.from({ length: 12 }, (_, month) => Array.from({ length: 31 }, (_, day) => ({ label: `${month + 1}月${day + 1}日`, value: `${month + 1}-${day + 1}` }))).flat()

const ScheduleMinuteSelect = ({ onChange, value }: { onChange?: (next: number[]) => void; value?: number[] }) => (
  <Select
    className="w-full"
    onChange={(next) => onChange?.([next])}
    options={HOUR_MINUTE_OPTIONS}
    placeholder="请选择执行分钟"
    value={Array.isArray(value) ? value[0] : undefined}
  />
)

// 周模式单一执行时刻：满宽单个时间选择器（无新增/删除），仍存 points=[{time}] 以复用 cron 转换
const ScheduleSingleTime = ({ onChange, value }: { onChange?: (next: any[]) => void; value?: any[] }) => {
  const time = Array.isArray(value) && value.length ? value[0]?.time : undefined
  return (
    <TimePicker
      className="w-full"
      format="HH:mm"
      popupClassName="schedule-time-panel"
      value={parseTimeDayjs(time)}
      onChange={(next) => onChange?.([{ time: next ? next.format('HH:mm') : '' }])}
    />
  )
}

// 执行条目编辑器：天=时刻，月/年=日期+时刻一对；支持添加/删除多条
const SchedulePointsEditor = ({ onChange, unit, value }: { onChange?: (next: any[]) => void; unit?: string; value?: any[] }) => {
  const list = Array.isArray(value) && value.length ? value : []
  const update = (index: number, patch: Record<string, any>) => onChange?.(list.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  const remove = (index: number) => onChange?.(list.filter((_, i) => i !== index))
  const add = () => onChange?.([...list, unit === 'MONTH' ? { day: 1, time: '09:00' } : unit === 'YEAR' ? { date: '1-1', time: '09:00' } : { time: '09:00' }])
  // 对齐管理端：每个执行时刻渲染为紧凑块（无边框选择器 + ✕ 删除），末尾 [+] 方块按钮新增，横向自动换行
  return (
    <div className="flex flex-wrap items-center gap-2">
      {list.map((point, index) => (
        <div key={index} className="flex items-center rounded-md border border-solid" style={{ background: '#fff', borderColor: '#e5e6eb' }}>
          {unit === 'MONTH' && (
            <Select
              className="w-24"
              options={MONTH_DAY_OPTIONS}
              value={point.day}
              variant="borderless"
              onChange={(next) => update(index, { day: next })}
            />
          )}
          {unit === 'YEAR' && (
            <Select
              className="w-28"
              options={YEAR_DATE_OPTIONS}
              value={point.date}
              variant="borderless"
              onChange={(next) => update(index, { date: next })}
            />
          )}
          <TimePicker
            format="HH:mm"
            popupClassName="schedule-time-panel"
            suffixIcon={null}
            value={parseTimeDayjs(point.time)}
            variant="borderless"
            onChange={(next) => update(index, { time: next ? next.format('HH:mm') : point.time })}
          />
          <CloseOutlined style={{ color: '#8a94a6', cursor: 'pointer', fontSize: 12, margin: '0 8px' }} onClick={() => remove(index)} />
        </div>
      ))}
      <Button icon={<PlusOutlined />} onClick={add} />
    </div>
  )
}

// 月模式日期选择：管理端同款 7 列日历方格弹层，触发框沿用 select 外观
const MONTH_DAYS = Array.from({ length: 31 }, (_, index) => index + 1)

const MonthDayGridPicker = ({ onChange, value }: { onChange?: (next: number) => void; value?: number }) => {
  const [open, setOpen] = useState(false)
  return (
    <Popover
      arrow={false}
      content={
        <div className="schedule-day-grid">
          {MONTH_DAYS.map((day) => (
            <div
              className={day === value ? 'schedule-day-cell is-active' : 'schedule-day-cell'}
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
    </Popover>
  )
}

// 月模式单一执行时刻：日期选择 + 时间选择器并排满宽（无新增/删除），存 points=[{day,time}] 以复用 cron 转换
const ScheduleMonthTime = ({ onChange, value }: { onChange?: (next: any[]) => void; value?: any[] }) => {
  const point = Array.isArray(value) && value.length ? value[0] : {}
  return (
    <div className="flex w-full gap-2">
      <div className="flex-1">
        <MonthDayGridPicker value={point.day} onChange={(next) => onChange?.([{ ...point, day: next }])} />
      </div>
      <TimePicker
        className="flex-1"
        format="HH:mm"
        popupClassName="schedule-time-panel"
        value={parseTimeDayjs(point.time)}
        onChange={(next) => onChange?.([{ ...point, time: next ? next.format('HH:mm') : '' }])}
      />
    </div>
  )
}

// 年模式日期选择：原生 Cascader 两列（左月右日），值存 "M-D" 字符串
const YEAR_CASCADER_OPTIONS = Array.from({ length: 12 }, (_month, monthIdx) => ({
  children: Array.from({ length: 31 }, (_day, dayIdx) => ({ label: `${dayIdx + 1}日`, value: dayIdx + 1 })),
  label: `${monthIdx + 1}月`,
  value: monthIdx + 1,
}))

const MonthDayCascader = ({ onChange, value }: { onChange?: (next: string) => void; value?: string }) => {
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
      popupClassName="schedule-md-panel"
      value={month && day ? [month, day] : undefined}
      onChange={(next) => onChange?.(next && next.length === 2 ? `${next[0]}-${next[1]}` : '')}
    />
  )
}

// 年模式：顶部单个日期（月日级联）+ 下方多时刻（纯时间 chip），所有时刻共享同一日期，存 points=[{date,time}]
const ScheduleYearTime = ({ onChange, value }: { onChange?: (next: any[]) => void; value?: any[] }) => {
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
            <TimePicker
              format="HH:mm"
              popupClassName="schedule-time-panel"
              suffixIcon={null}
              value={parseTimeDayjs(point.time)}
              variant="borderless"
              onChange={(next) => updateTime(index, next ? next.format('HH:mm') : point.time)}
            />
            <CloseOutlined style={{ color: '#8a94a6', cursor: 'pointer', fontSize: 12, margin: '0 8px' }} onClick={() => removeAt(index)} />
          </div>
        ))}
        <Button icon={<PlusOutlined />} onClick={addTime} />
      </div>
    </div>
  )
}

// 调度字段组：三种模式的周期字段，字段名与管理端表单一致；标签排布继承宿主 Form 的 layout/labelCol
export const ScheduleFormItems = ({ mode }: { mode?: string }) => {
  const form = Form.useFormInstance()
  const repeatUnit = Form.useWatch('unit', form)

  // 切换重复周期时把执行条目归一成新周期形状（月/年带日期、天/周仅时刻），避免旧周期字段残留进 conf
  useEffect(() => {
    if (!repeatUnit) return
    const values = form.getFieldsValue()
    if (repeatUnit === 'HOUR') {
      if (!Array.isArray(values.minutes) || !values.minutes.length) form.setFieldsValue({ minutes: [0] })
      return
    }
    const points = (Array.isArray(values.points) ? values.points : []).map((point: any) => {
      const time = point?.time || '09:00'
      if (repeatUnit === 'MONTH') return { day: point?.day ?? 1, time }
      if (repeatUnit === 'YEAR') return { date: point?.date || '1-1', time }
      return { time }
    })
    form.setFieldsValue({ points: points.length ? points : [{ time: '09:00' }] })
  }, [repeatUnit, form])

  if (mode === 'ONCE') {
    return (
      <>
        <Form.Item label="执行日期" name="execDate" rules={[{ required: true, message: '请选择执行日期' }]}>
          <DatePicker className="w-full" placeholder="请选择日期" />
        </Form.Item>
        <Form.Item label="执行时间" name="execTime" rules={[{ required: true, message: '请选择执行时间' }]}>
          <TimePicker className="w-full" format="HH:mm" placeholder="请选择时间" popupClassName="schedule-time-panel" />
        </Form.Item>
      </>
    )
  }

  if (mode !== 'CONTINUOUS' && mode !== 'PERIODIC') return null

  return (
    <>
      <Form.Item label="重复周期">
        <div className="flex gap-2">
          {mode === 'PERIODIC' && (
            <Form.Item className="mb-0 flex-1" name="interval" rules={[{ required: true, message: '请输入重复间隔' }]}>
              <InputNumber addonAfter="个周期" className="w-full" min={1} />
            </Form.Item>
          )}
          <Form.Item className="mb-0 flex-1" name="unit" rules={[{ required: true, message: '请选择重复周期' }]}>
            <Select options={REPEAT_UNIT_OPTIONS} />
          </Form.Item>
        </div>
      </Form.Item>
      <Form.Item label="执行时间">
        <div className="flex flex-col gap-2">
          {repeatUnit === 'WEEK' && (
            <Form.Item className="mb-0" name="weekDay" rules={[{ required: true, message: '请选择星期' }]}>
              <WeekDayCircles />
            </Form.Item>
          )}
          {repeatUnit === 'HOUR' ? (
            <Form.Item className="mb-0" name="minutes" rules={[{ required: true, type: 'array', message: '请选择执行分钟' }]}>
              <ScheduleMinuteSelect />
            </Form.Item>
          ) : repeatUnit === 'WEEK' ? (
            <Form.Item className="mb-0" name="points" rules={[{ required: true, type: 'array', message: '请选择执行时间' }]}>
              <ScheduleSingleTime />
            </Form.Item>
          ) : repeatUnit === 'MONTH' ? (
            <Form.Item className="mb-0" name="points" rules={[{ required: true, type: 'array', message: '请选择执行时间' }]}>
              <ScheduleMonthTime />
            </Form.Item>
          ) : repeatUnit === 'YEAR' ? (
            <Form.Item className="mb-0" name="points" rules={[{ required: true, type: 'array', message: '请添加执行时间' }]}>
              <ScheduleYearTime />
            </Form.Item>
          ) : (
            <Form.Item className="mb-0" name="points" rules={[{ required: true, type: 'array', message: '请添加执行时间' }]}>
              <SchedulePointsEditor unit={repeatUnit} />
            </Form.Item>
          )}
        </div>
      </Form.Item>
      {mode === 'PERIODIC' && (
        <Form.Item label="截止日期" name="deadline" rules={[{ required: true, message: '请选择截止日期' }]}>
          <DatePicker className="w-full" placeholder="请选择截止日期" />
        </Form.Item>
      )}
    </>
  )
}
