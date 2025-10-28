import { JOB_GROUP_OPTIONS, JOB_STATUS_OPTIONS } from '@/constants/job';

const KeySearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  return (
    <AForm
      form={form}
      labelCol={{
        md: 7,
        span: 5
      }}
    >
      <ARow
        wrap
        gutter={[16, 16]}
      >
        <ACol
          lg={6}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label="任务名称"
            name="jobName"
          >
            <AInput
              allowClear
              placeholder="请输入任务名称"
            />
          </AForm.Item>
        </ACol>
        <ACol
          lg={6}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label="任务组名"
            name="jobGroup"
          >
            <ASelect
              allowClear
              options={JOB_GROUP_OPTIONS}
              placeholder="请选择任务组名"
            />
          </AForm.Item>
        </ACol>
        <ACol
          lg={6}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label="任务状态"
            name="status"
          >
            <ASelect
              allowClear
              options={JOB_STATUS_OPTIONS}
              placeholder="请输入任务状态"
            />
          </AForm.Item>
        </ACol>
        <ACol
          lg={6}
          md={12}
          span={24}
        >
          <AForm.Item className="m-0">
            <AFlex
              align="center"
              gap={12}
              justify="end"
            >
              <AButton
                icon={<IconIcRoundRefresh />}
                onClick={reset}
              >
                {t('common.reset')}
              </AButton>
              <AButton
                ghost
                icon={<IconIcRoundSearch />}
                type="primary"
                onClick={search}
              >
                {t('common.search')}
              </AButton>
            </AFlex>
          </AForm.Item>
        </ACol>
      </ARow>
    </AForm>
  );
});

export default KeySearch;
