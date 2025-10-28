const PostSearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
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
            label={t('page.manage.post.postCode')}
            name="postCode"
          >
            <AInput
              maxLength={50}
              placeholder={t('page.manage.post.form.postCode')}
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
            label={t('page.manage.post.postName')}
            name="postName"
          >
            <AInput
              maxLength={50}
              placeholder={t('page.manage.post.form.postName')}
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
            label={t('page.manage.user.userStatus')}
            name="status"
          >
            <ASelect
              allowClear
              className="w-200px"
              options={statusOptions}
              placeholder={t('page.manage.common.form.status')}
            />
          </AForm.Item>
        </ACol>

        {/* <ACol
          lg={6}
          md={10}
          span={24}
        ></ACol> */}

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

export default PostSearch;
