import { MEMORY_CHAT_MODE_OPTIONS, MEMORY_STATUS_OPTIONS } from '@/constants/assistant-config';

const KeySearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  return (
    <AForm
      className="mb-2"
      form={form}
      labelAlign="right"
      labelCol={{ flex: '88px' }}
    >
      <ARow
        wrap
        gutter={[16, 16]}
      >
        <ACol
          lg={8}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label={<span>问&emsp;&emsp;题</span>}
            name="question"
          >
            <AInput allowClear style={{ width: 180 }} />
          </AForm.Item>
        </ACol>
        <ACol
          lg={8}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label="评估人"
            name="eval_by"
          >
            <AInput allowClear style={{ width: 180 }} />
          </AForm.Item>
        </ACol>
        <ACol
          lg={8}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label="提交人"
            name="create_by"
          >
            <AInput allowClear style={{ width: 180 }} />
          </AForm.Item>
        </ACol>
        <ACol
          lg={8}
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
              style={{ width: 180 }}
            />
          </AForm.Item>
        </ACol>
        <ACol
          lg={8}
          md={12}
          span={24}
        >
          <AForm.Item
            className="m-0"
            label="状&emsp;态"
            name="status"
          >
            <ASelect
              allowClear
              options={MEMORY_STATUS_OPTIONS}
              placeholder="全部"
              style={{ width: 180 }}
            />
          </AForm.Item>
        </ACol>
        <ACol
          lg={8}
          md={24}
          span={24}
        >
          <AForm.Item className="m-0" colon={false}  label=" ">
            <AFlex
              align="center"
              gap={12}
              justify="end"
              style={{ width: 180 }}
            >
              <AButton
                type="primary"
                onClick={reset}
              >
                {t('common.reset')}
              </AButton>
              <AButton
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
