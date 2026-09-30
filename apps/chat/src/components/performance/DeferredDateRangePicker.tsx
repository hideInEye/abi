import { DatePicker } from 'antd'

interface DeferredDateRangePickerProps {
  value: any
  onChange: (dates: any) => void
}

export default function DeferredDateRangePicker({ value, onChange }: DeferredDateRangePickerProps) {
  return (
    <DatePicker.RangePicker
      allowClear
      format="YYYY-MM-DD"
      placeholder={['开始时间', '结束时间']}
      value={value}
      getPopupContainer={(trigger) =>
        (trigger.closest('.ant-popover-inner') as HTMLElement) || (trigger.parentElement as HTMLElement)
      }
      onChange={onChange}
    />
  )
}
