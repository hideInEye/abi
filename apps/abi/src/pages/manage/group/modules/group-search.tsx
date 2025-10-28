const RoleSearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  return (
    <AForm
      className="flex justify-between"
      form={form}
      labelCol={{
        md: 7,
        span: 5
      }}
    >
      <AForm.Item
        className="m-0"
        label="部门名称"
        name="deptName"
      >
        <AInput
          className="w-200px"
          maxLength={50}
          placeholder="请输入部门名称"
        />
      </AForm.Item>
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
    </AForm>
  );
});

export default RoleSearch;
