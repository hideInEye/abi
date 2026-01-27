const KeySearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  return (
    <AForm
      form={form}
      labelCol={{
        md: 8,
        span: 6
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
            label="模型名称"
            name="modelName"
          >
            <AInput placeholder="请输入模型名称" />
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
                style={{ borderRadius: '4px', padding: '4px 25px' }}
                // icon={<IconIcRoundRefresh />}
                type="primary"
                onClick={reset}
              >
                {t('common.reset')}
              </AButton>
              <AButton
                style={{ borderRadius: '4px', padding: '4px 25px' }}
                // icon={<IconIcRoundSearch />}
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
