import { ApartmentOutlined, TeamOutlined, UserSwitchOutlined } from '@ant-design/icons'

import RelatedRoles from './related-roles'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'

import './group-operate-drawer.scss'

type Props = Page.OperateDrawerProps & { rowId: number }

type Model = Pick<Api.SystemManage.Role, 'roleCode' | 'roleDesc' | 'roleName' | 'status'>

type RuleKey = Exclude<keyof Model, 'roleDesc'>

/** v5 分区标题 */
const SectionTitle: FC<{ icon: React.ReactNode; title: string; color?: string }> = ({
  icon,
  title,
  color = '#5b7cf7',
}) => (
  <div className="group-section-title">
    <div
      className="group-section-icon"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        boxShadow: `0 2px 8px ${color}30`,
        position: 'relative',
      }}
    >
      {icon}
    </div>
    <span className="group-section-text">{title}</span>
  </div>
)

const GroupOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()
  const { defaultRequiredRule } = useFormRules()

  const rules: Record<RuleKey, App.Global.FormRule> = {
    roleCode: defaultRequiredRule,
    roleName: defaultRequiredRule,
    status: defaultRequiredRule,
  }

  const drawerTitle = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #5b7cf7 0%, #7091fa 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: 18,
          boxShadow: '0 4px 12px rgba(91, 124, 247, 0.3)',
        }}
      >
        <ApartmentOutlined />
      </div>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700, color: '#1a2744', letterSpacing: '0.02em' }}>
          {operateType === 'add' ? '新建组织' : '编辑组织'}
        </div>
        <div style={{ fontSize: 12, color: '#768a9f', marginTop: 2 }}>
          {operateType === 'add' ? '创建新的组织节点并配置关联角色' : '修改组织信息及角色关联'}
        </div>
      </div>
    </div>
  )

  return (
    <CommonDrawer
      className="group-drawer-v5"
      destroyOnClose
      open={open}
      title={drawerTitle}
      width={480}
      footer={
        <div className="group-drawer-footer-v5">
          <AButton className="btn-ghost-v5" onClick={onClose}>
            {t('common.cancel')}
          </AButton>
          <AButton className="btn-accent-gradient" onClick={handleSubmit}>
            {t('common.confirm')}
          </AButton>
        </div>
      }
      onClose={onClose}
    >
      <div className="group-form-panel">
        <AForm form={form} layout="vertical">
          {/* ── 基本信息分区 ── */}
          <SectionTitle icon={<TeamOutlined />} title="基本信息" color="#5b7cf7" />

          <div className="group-form-row">
            <AForm.Item label="组织名称" name="roleName" rules={[rules.roleName]}>
              <AInput placeholder="请输入组织名称" />
            </AForm.Item>

            <AForm.Item label="组织编号" name="roleCode" rules={[rules.roleCode]}>
              <AInput placeholder="请输入组织编号" />
            </AForm.Item>
          </div>

          {/* ── 层级关系分区 ── */}
          <SectionTitle icon={<ApartmentOutlined />} title="层级关系" color="#10b981" />

          <AForm.Item label="上级组织" name="roleDesc">
            <ASelect placeholder="请选择上级组织" allowClear />
          </AForm.Item>

          {/* ── 权限配置分区 ── */}
          <SectionTitle icon={<UserSwitchOutlined />} title="权限配置" color="#8b5cf6" />

          <div className="group-transfer-wrapper">
            <AForm.Item label="关联角色" name="roleAuth">
              <RelatedRoles />
            </AForm.Item>
          </div>
        </AForm>
      </div>
    </CommonDrawer>
  )
})

export default GroupOperateDrawer
