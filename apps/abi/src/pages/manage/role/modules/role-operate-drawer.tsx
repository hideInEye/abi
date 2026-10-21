import { enableStatusOptions } from '@/constants/business'

import RoleAuth from './role-auth'
import type { RoleAuthRef } from './role-auth'
import './role-drawer.scss'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

type Props = Page.OperateDrawerProps & { rowId: number }

const RoleOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()
  const roleAuthRef = useRef<RoleAuthRef>(null)

  const submit = async () => {
    try {
      let values = await form.validateFields()
      const menuIds = roleAuthRef.current?.getMenuIds()
      if (!menuIds) {
        window.$message?.warning('菜单权限尚未加载成功，请稍后重试')
        return
      }
      values = {
        ...values,
        deptCheckStrictly: values.deptCheckStrictly || true,
        deptIds: values.deptIds || [],
        menuCheckStrictly: values.menuCheckStrictly || true,
        menuIds,
      }
      handleSubmit({ ...values })
    } catch (err) {
      // eslint-disable-next-line
      console.log(err)
    }
  }

  return (
    <CommonDrawer
      className="role-drawer-v5"
      open={open}
      title={operateType === 'add' ? t('page.manage.role.addRole') : t('page.manage.role.editRole')}
      footer={
        <div className="role-drawer-footer-v5">
          <AButton className="btn-ghost-v5" onClick={onClose}>
            {t('common.cancel')}
          </AButton>
          <AButton className="btn-accent-gradient" onClick={submit}>
            {t('common.confirm')}
          </AButton>
        </div>
      }
      onClose={onClose}
    >
      <div className="role-form-panel">
        <AForm form={form} initialValues={{ status: '0' }} layout="vertical">
          <AForm.Item label={t('page.manage.role.roleName')} name="roleName" rules={[{ required: true }]}>
            <AInput placeholder={t('page.manage.role.form.roleName')} />
          </AForm.Item>

          <AForm.Item label={t('page.manage.role.permission')} name="roleKey" rules={[{ required: true }]}>
            <AInput placeholder={t('page.manage.role.form.roleKey')} />
          </AForm.Item>

          <AForm.Item label={t('page.manage.role.roleSort')} name="roleSort" rules={[{ required: true }]}>
            <AInputNumber className="w-full" min={1} placeholder={t('page.manage.role.form.roleSort')} precision={0} />
          </AForm.Item>

          <AForm.Item label={t('page.manage.role.roleStatus')} name="status" rules={[{ required: true }]}>
            <ARadio.Group>
              {enableStatusOptions.map((item) => (
                <ARadio key={item.value} value={item.value}>
                  {t(item.label)}
                </ARadio>
              ))}
            </ARadio.Group>
          </AForm.Item>

          <AForm.Item label={t('page.manage.role.menuAuth')} name="menuIds">
            <RoleAuth ref={roleAuthRef} />
          </AForm.Item>

          <AForm.Item label={t('page.manage.role.remark')} name="remark">
            <AInput.TextArea placeholder={t('page.manage.role.form.remark')} rows={3} />
          </AForm.Item>
        </AForm>
      </div>
    </CommonDrawer>
  )
})

export default RoleOperateDrawer
