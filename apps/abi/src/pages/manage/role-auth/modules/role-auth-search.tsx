const RoleAuthSearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
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
            label={t('page.manage.user.userName')}
            name="userName"
          >
            <AInput
              maxLength={50}
              placeholder={t('page.manage.user.form.userName')}
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
            label={t('page.manage.user.phonenumber')}
            name="phonenumber"
          >
            <AInput
              maxLength={11}
              placeholder={t('page.manage.user.form.phonenumber')}
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

export default RoleAuthSearch;
