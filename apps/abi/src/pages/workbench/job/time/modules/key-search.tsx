import { SearchOutlined } from '@ant-design/icons';
import { JOB_STATUS_OPTIONS } from '@/constants/job';

const KeySearch: FC<Page.SearchProps> = memo(({ form }) => {
  return (
    <>
      <AForm.Item
        className="m-0"
        name="jobName"
      >
        <AInput
          allowClear
          placeholder="请输入任务名称"
          prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
          className="abi-field-input"
          style={{ width: '12rem' }}
        />
      </AForm.Item>
      <AForm.Item
        className="m-0"
        name="status"
      >
        <ASelect
          allowClear
          options={JOB_STATUS_OPTIONS}
          placeholder="请选择任务状态"
          className="abi-field-input"
          style={{ width: '12rem' }}
        />
      </AForm.Item>
    </>
  );
});

export default KeySearch;
