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
    <AForm form={form}>
      <AFlex  gap={12} wrap>
        <ASpace>
          <AForm.Item className="mb-0" label="任务名称" name="jobName">
            <AInput style={{ width: '200px' }} allowClear placeholder="请输入任务名称" />
          </AForm.Item>
          <AForm.Item className="mb-0" label="任务状态" name="status">
            <ASelect style={{ width: '200px' }} allowClear options={jobOptions} placeholder="请输入任务状态" />
          </AForm.Item>
        </ASpace>
        <ASpace>
          <AButton icon={<IconIcRoundRefresh />} onClick={reset}>
            {t('common.reset')}
          </AButton>
          <AButton ghost icon={<IconIcRoundSearch />} type="primary" onClick={search}>
            {t('common.search')}
          </AButton>
        </ASpace>
      </AFlex>
    </AForm>
  );
});

export default KeySearch;
