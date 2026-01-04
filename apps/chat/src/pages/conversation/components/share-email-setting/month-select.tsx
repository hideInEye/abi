import { message, Select, Space, TimePicker } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

const MonthSelect = ({ value, onChange }: { value?: any; onChange?: (value: any) => void }) => {
  const [options, setOptions] = useState<{ label: string; value: number }[]>([]);

  useEffect(() => {
    handleOptions();
  }, []);

  const handleOptions = () => {
    const options: { label: string; value: number }[] = [];
    for (let i = 1; i <= 31; i++) {
      options.push({
        label: i + '号',
        value: i,
      });
    }
    setOptions(options);
  };

  const onChangeTime = (time: any, timeString: string | string[]) => {
    onChange?.({
      time: timeString,
      status: value?.status,
    });
  };

  const onChangeWeek = (status: number) => {
    if (status === 31) {
      message.warning('31号在特定月份会被指定为月底最后一天');
    }
    onChange?.({
      time: value?.time,
      status,
    });
  };

  return (
    <Space>
      <span>每月</span>
      <Select style={{ width: '100px' }} placeholder="请选择" value={value?.status} onChange={onChangeWeek} options={options} />
      <TimePicker placeholder="请选择执行时间" style={{ width: '200px' }} value={value?.time && dayjs(value?.time, 'HH:mm:ss')} onChange={onChangeTime} />
    </Space>
  );
};

export default MonthSelect;
