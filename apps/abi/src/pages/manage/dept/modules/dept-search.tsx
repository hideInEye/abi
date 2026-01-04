const DeptSearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  const statusOptions = [
    { label: t('page.manage.common.status.enable'), value: '0' },
    { label: t('page.manage.common.status.disable'), value: '1' }
  ];

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
            label={t('page.manage.dept.deptName')}
            name="deptName"
          >
            <AInput
              allowClear
              maxLength={50}
              placeholder={t('page.manage.dept.form.deptName')}
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
            label={t('page.manage.dept.status')}
            name="status"
          >
            <ASelect
              allowClear
              options={statusOptions}
              placeholder={t('page.manage.common.form.status')}
            />
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

export default DeptSearch;
