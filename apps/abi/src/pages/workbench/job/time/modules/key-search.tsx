import { JOB_STATUS_OPTIONS } from '@/constants/job';

const KeySearch: FC<Page.SearchProps> = memo(({ form }) => {
  return (
    <AForm form={form} layout="inline">
      <AForm.Item
        className="m-0"
        name="jobName"
      >
        <AInput
          allowClear
          placeholder="请输入任务名称"
          style={{ width: '12.5rem' }}
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
          style={{ width: '12.5rem' }}
        />
      </AForm.Item>
    </AForm>
  );
});

export default KeySearch;
