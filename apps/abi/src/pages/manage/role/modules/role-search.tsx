const RoleSearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
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
            label={t('page.manage.role.roleName')}
            name="roleName"
          >
            <AInput
              maxLength={50}
              placeholder={t('page.manage.role.form.roleName')}
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
            label={t('page.manage.role.permission')}
            name="roleKey"
          >
            <AInput
              maxLength={50}
              placeholder={t('page.manage.role.form.roleKey')}
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
        >
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
        </ACol>
      </ARow>
    </AForm>
  );
});

export default RoleSearch;
