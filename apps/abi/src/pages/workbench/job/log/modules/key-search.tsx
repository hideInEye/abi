import { RUN_STATUS_OPTIONS } from '@/constants/job';
import { DatePicker } from 'antd';
const { RangePicker } = DatePicker;
const KeySearch: FC<Page.SearchProps> = memo(({ form }) => {
  return (
    <AForm form={form} layout="inline">
      <AForm.Item
        className="m-0"
        name="lastSendTime"
      >
        <RangePicker
          placeholder={['任务开始时间', '任务结束时间']}
          showTime
          format={["YYYY-MM-DD HH:mm:ss", "YYYY-MM-DD HH:mm:ss"]}
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
          style={{ width: 200 }}
        />
      </AForm.Item>
    </AForm>
  );
});

export default KeySearch;
