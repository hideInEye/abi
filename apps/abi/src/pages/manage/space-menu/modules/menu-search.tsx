const MenuSearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  const statusOptions = [
    { label: t('page.manage.common.status.enable'), value: '0' },
    { label: t('page.manage.common.status.disable'), value: '1' }
  ];

  return (
    <AForm
      form={form}
      labelCol={{
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
            label={t('page.manage.menu.menuName')}
            name="menuName"
          >
            <AInput
              allowClear
              maxLength={50}
              placeholder={t('page.manage.menu.form.menuName')}
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
            label={t('page.manage.menu.menuStatus')}
            name="status"
          >
            <ASelect
              allowClear
              options={statusOptions}
              placeholder={t('page.manage.menu.form.menuStatus')}
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

export default MenuSearch;
