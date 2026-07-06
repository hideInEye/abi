// import { enableStatusOptions } from '@/constants/business';

import RelatedRoles from './related-roles'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

// import ButtonAuthModal from './button-auth-modal';
// import RoleAuth from './role-auth';

type Props = Page.OperateDrawerProps & { rowId: number }

type Model = Pick<Api.SystemManage.Role, 'roleCode' | 'roleDesc' | 'roleName' | 'status'>

type RuleKey = Exclude<keyof Model, 'roleDesc'>

const RoleOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()

  const { defaultRequiredRule } = useFormRules()

  // const [buttonAuthVisible, { setFalse: closeButtonAuthModal, setTrue: openButtonAuthModal }] = useBoolean();

  // const [menuAuthVisible, { setFalse: closeMenuAuthModal, setTrue: openMenuAuthModal }] = useBoolean();

  const rules: Record<RuleKey, App.Global.FormRule> = {
    roleCode: defaultRequiredRule,
    roleName: defaultRequiredRule,
    status: defaultRequiredRule,
  }

  return (
    <CommonDrawer
      open={open}
      title={operateType === 'add' ? '新建组织' : '编辑组织'}
      width={440}
      footer={
        <AFlex justify="space-between">
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton type="primary" onClick={handleSubmit}>
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      onClose={onClose}
    >
      <AForm form={form} layout="vertical">
        <AFlex className="gap gap-2">
          <AForm.Item label="组织名称" name="roleName" rules={[rules.roleName]}>
            <AInput placeholder={t('page.manage.role.form.roleName')} />
          </AForm.Item>

          <AForm.Item label="组织编号" name="roleCode" rules={[rules.roleCode]}>
            <AInput placeholder={t('page.manage.role.form.roleCode')} />
          </AForm.Item>
        </AFlex>
        <AForm.Item label="上级组织" name="roleDesc">
          <ASelect placeholder="请选择上级组织" />
        </AForm.Item>

        <AForm.Item label="关联角色" name="roleAuth">
          <RelatedRoles />
        </AForm.Item>
      </AForm>
    </CommonDrawer>
  )
})

export default RoleOperateDrawer
