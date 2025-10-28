import { enableStatusOptions } from '@/constants/business';

import RoleAuth from './role-auth';

type Props = Page.OperateDrawerProps & { rowId: number };

const RoleOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation();

  const submit = async () => {
    try {
      let values = await form.validateFields();
      values = {
        ...values,
        deptCheckStrictly: values.deptCheckStrictly || true,
        deptIds: values.deptIds || [],
        menuCheckStrictly: values.menuCheckStrictly || true,
        menuIds: values.menuIds || []
      };
      handleSubmit({ ...values });
    } catch (err) {
      // eslint-disable-next-line
      console.log(err);
    }
  };

  return (
    <ADrawer
      open={open}
      title={operateType === 'add' ? t('page.manage.role.addRole') : t('page.manage.role.editRole')}
      footer={
        <AFlex justify="space-between">
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton
            type="primary"
            onClick={submit}
          >
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      onClose={onClose}
    >
      <AForm
        form={form}
        initialValues={{ status: '0' }}
        layout="vertical"
      >
        <AForm.Item
          label={t('page.manage.role.roleName')}
          name="roleName"
          rules={[{ required: true }]}
        >
          <AInput placeholder={t('page.manage.role.form.roleName')} />
        </AForm.Item>

        <AForm.Item
          label={t('page.manage.role.permission')}
          name="roleKey"
          rules={[{ required: true }]}
        >
          <AInput placeholder={t('page.manage.role.form.roleKey')} />
        </AForm.Item>

        <AForm.Item
          label={t('page.manage.role.roleSort')}
          name="roleSort"
          rules={[{ required: true }]}
        >
          <AInputNumber
            className="w-full"
            min={1}
            placeholder={t('page.manage.role.form.roleSort')}
            precision={0}
          />
        </AForm.Item>

        <AForm.Item
          label={t('page.manage.role.roleStatus')}
          name="status"
          rules={[{ required: true }]}
        >
          <ARadio.Group>
            {enableStatusOptions.map(item => (
              <ARadio
                key={item.value}
                value={item.value}
              >
                {t(item.label)}
              </ARadio>
            ))}
          </ARadio.Group>
        </AForm.Item>

        <AForm.Item
          label={t('page.manage.role.menuAuth')}
          name="menuIds"
        >
          <RoleAuth />
        </AForm.Item>

        <AForm.Item
          label={t('page.manage.role.remark')}
          name="remark"
        >
          <AInput.TextArea placeholder={t('page.manage.role.form.remark')} />
        </AForm.Item>
      </AForm>
    </ADrawer>
  );
});

export default RoleOperateDrawer;
