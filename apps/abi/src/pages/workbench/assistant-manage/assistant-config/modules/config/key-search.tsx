import { MEMORY_CHAT_MODE_OPTIONS, MEMORY_STATUS_OPTIONS } from '@/constants/assistant-config';

const KeySearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  return (
    <AForm
      className="mb-2"
      form={form}
      labelCol={{
        md: 9,
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
            label="问题"
            name="question"
          >
            <AInput allowClear />
          </AForm.Item>
        </ACol>
        <ACol
          lg={6}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label="场景类型"
            name="chat_mode"
          >
            <ASelect
              allowClear
              options={MEMORY_CHAT_MODE_OPTIONS}
              placeholder="全部"
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
            label="状态"
            name="status"
          >
            <ASelect
              allowClear
              options={MEMORY_STATUS_OPTIONS}
              placeholder="全部"
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
            label="评估人"
            name="eval_by"
          >
            <AInput allowClear />
          </AForm.Item>
        </ACol>
        <ACol
          lg={6}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label="提交人"
            name="create_by"
          >
            <AInput allowClear />
          </AForm.Item>
        </ACol>
        <ACol
          lg={6}
          md={12}
          span={24}
        />
        <ACol
          lg={6}
          md={12}
          span={24}
        />
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
