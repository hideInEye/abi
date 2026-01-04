import { Select, Space, TimePicker } from 'antd';
import dayjs from 'dayjs';

const WeekSelect = ({ value, onChange }: { value?: any; onChange?: (value: any) => void }) => {
  const onChangeTime = (time: any, timeString: string | string[]) => {
    onChange?.({
      time: timeString,
      status: value?.status,
    });
  };

  const options = [
    { label: '周一', value: 1 },
    { label: '周二', value: 2 },
    { label: '周三', value: 3 },
    { label: '周四', value: 4 },
    { label: '周五', value: 5 },
    { label: '周六', value: 6 },
    { label: '周日', value: 7 },
  ];

  const onChangeWeek = (status: string) => {
    onChange?.({
      time: value?.time,
      status,
    });
  };

  return (
    <Space>
      <span>每周</span>
      <Select style={{ width: '100px' }} placeholder="请选择" options={options} value={value?.status} onChange={onChangeWeek} />
      <TimePicker placeholder="请选择执行时间" value={value?.time && dayjs(value?.time, 'HH:mm:ss')} onChange={onChangeTime} />
    </Space>
  );
};

export default WeekSelect;
