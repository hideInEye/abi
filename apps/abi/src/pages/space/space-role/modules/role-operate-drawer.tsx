import { enableStatusOptions } from '@/constants/business'
import { useRequest } from '@sa/hooks'
import { getSpaceMenuTreeApi } from '@/service/api/space-role'
import RoleAuth from './role-auth'
import './role-operate-drawer.scss'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

type Props = Page.OperateDrawerProps & { rowId: number }

// 递归转换树结构函数
function recursiveTransform(data: any[] | null): any[] {
  return data
    ? data.map((item) => {
        const { id: key, label } = item

        if (item.children) {
          return {
            children: recursiveTransform(item.children),
            key,
            title: label,
          }
        }

        return {
          key,
          title: label,
        }
      })
    : []
}

const RoleOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()

  // 在父组件中获取树数据
  const { data: menuTree } = useRequest(getSpaceMenuTreeApi)

  // 在提交时添加父节点ID
  const submit = async () => {
    try {
      const values = await form.validateFields()

      handleSubmit({ ...values })
    } catch (err) {
      console.error(err)
    }
  }

  const handleTreeData = useMemo(() => {
    return menuTree ? recursiveTransform(menuTree) : []
  }, [menuTree])

  return (
    <CommonDrawer
      className="space-role-drawer-v5"
      open={open}
      title={operateType === 'add' ? t('page.manage.role.addRole') : t('page.manage.role.editRole')}
      footer={
        <div className="space-role-drawer-footer-v5">
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
      <div className="space-role-form-panel">
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
            <RoleAuth open={open} treeData={handleTreeData} />
          </AForm.Item>

          <AForm.Item label={t('page.manage.role.remark')} name="remark">
            <AInput.TextArea placeholder={t('page.manage.role.form.remark')} />
          </AForm.Item>
        </AForm>
      </div>
    </CommonDrawer>
  )
})

export default RoleOperateDrawer
