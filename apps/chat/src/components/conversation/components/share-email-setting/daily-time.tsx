import React from 'react';
import { TimePicker } from 'antd';
import dayjs from 'dayjs';
interface DailyTimeProps {
  onChange?: (value: any) => void;
  value?: any;
}
const DailyTime = (props: DailyTimeProps) => {
  const { onChange, value } = props;
  const onChangeTime = (_: any, timeString: string | string[]) => {
    onChange?.({ time: timeString });
  };
  return <TimePicker placeholder="请选择执行时间" onChange={onChangeTime} value={value?.time && dayjs(value?.time, 'HH:mm:ss')} />;
};

export default DailyTime;
