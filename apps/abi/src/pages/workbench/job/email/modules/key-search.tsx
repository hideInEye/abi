import { shareMailStatus } from '@/types/job';

const KeySearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  const jobOptions = useMemo(()=>{
    return Object.entries(shareMailStatus).map(([key, value]) => ({
      label: value,
      value: key,
    }));
  },[shareMailStatus])

  return (
    <AForm form={form} layout="inline">
      <AForm.Item
        className="m-0"
        name="jobName"
      >
        <AInput style={{ width: '12.5rem' }} allowClear placeholder="请输入任务名称" />
      </AForm.Item>
      <AForm.Item className="m-0" name="status">
        <ASelect style={{ width: '12.5rem' }} allowClear options={jobOptions} placeholder="请选择任务状态" />
      </AForm.Item>
    </AForm>
  );
});

export default KeySearch;
