import { DatePicker } from 'antd';

const { RangePicker } = DatePicker;

const UserSearch: FC<Page.SearchProps> = memo(({ form, reset, search }) => {
  const { t } = useTranslation();

  const statusOptions = [
    { label: t('page.manage.common.status.enable'), value: '0' },
    { label: t('page.manage.common.status.disable'), value: '1' }
  ];

  return (
    <AForm form={form}>
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
            label={t('page.manage.user.userPhone')}
            name="phonenumber"
          >
            <AInput
              maxLength={11}
              placeholder={t('page.manage.user.form.userPhone')}
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
              options={statusOptions}
              placeholder={t('page.manage.common.form.status')}
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
            label={t('page.manage.common.createTime')}
          >
            <RangePicker
              allowClear
              format="YYYY-MM-DD"
              placeholder={[t('page.manage.common.beginTime'), t('page.manage.common.endTime')]}
              style={{ width: '100%' }}
              onChange={(dates, dateStrings) => {
                if (dates && dates.length === 2) {
                  form.setFieldsValue({
                    params: {
                      beginTime: dateStrings[0],
                      endTime: dateStrings[1]
                    }
                  });
                } else {
                  form.setFieldsValue({
                    params: {
                      beginTime: undefined,
                      endTime: undefined
                    }
                  });
                }
              }}
            />
          </AForm.Item>

          {/* 隐藏的beginTime和endTime字段（如果需要表单验证） */}
          <AForm.Item name="params" style={{ display: 'none' }}>
            <AInput />
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
        </ACol>
      </ARow>
    </AForm>
  );
});

export default UserSearch;
