import { JOB_GROUP_OPTIONS, RUN_STATUS_OPTIONS } from '@/constants/job';
import { DatePicker } from 'antd';
const { RangePicker } = DatePicker;
const KeySearch: FC<Page.SearchProps & { jobDetail: any }> = memo(({ form, jobDetail, reset, search }) => {
  const { t } = useTranslation();

  return (
    <AForm form={form}>
      <AFlex gap={12} wrap>
        <ASpace wrap size={8}>
          <AForm.Item className="m-0" label="任务执行时间" name="lastSendTime">
            <RangePicker style={{ width: 400 }} showTime format={["YYYY-MM-DD HH:mm:ss","YYYY-MM-DD HH:mm:ss"]} />
          </AForm.Item>
          <AForm.Item className="m-0" label="执行状态" name="status">
            <ASelect style={{ width: 200 }} allowClear options={RUN_STATUS_OPTIONS} placeholder="请选择执行状态" />
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
