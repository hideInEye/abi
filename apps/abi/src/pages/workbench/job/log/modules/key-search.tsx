import { RUN_STATUS_OPTIONS } from '@/constants/job';
import { DatePicker } from 'antd';
const { RangePicker } = DatePicker;
const KeySearch: FC<Page.SearchProps> = memo(({ form }) => {
  return (
    <>
      <AForm.Item
        className="m-0"
        name="lastSendTime"
      >
        <RangePicker
          placeholder={['任务开始时间', '任务结束时间']}
          showTime
          format={["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm:ss"]}
          className="abi-field-input"
          style={{ width: 400 }}
        />
      </AForm.Item>
      <AForm.Item
        className="m-0"
        name="status"
      >
        <ASelect
          allowClear
          options={RUN_STATUS_OPTIONS}
          placeholder="请选择执行状态"
          className="abi-field-input"
          style={{ width: 200 }}
        />
      </AForm.Item>
    </>
  );
});

export default KeySearch;
