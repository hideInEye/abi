import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Form } from 'antd';

import { permissonRanaeOptions } from '@/constants/business';
import { roleIdMenuTree, roleInfo } from '@/service/api/role';

import './role-drawer.scss';

interface RolePermissioDrawerProps {
  roleId: number;
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: any) => Promise<void>;
}

const RolePermissionDrawer: React.FC<RolePermissioDrawerProps> = ({ roleId, visible, onClose, onSubmit }) => {
  const { t } = useTranslation();

  const [form] = AForm.useForm();

  const [treeData, setTreeData] = useState([]);

  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);

  const dataScope = Form.useWatch('dataScope', form);

  // 处理树形组件选中变化
  const handleDeptChange = (curCheckedKeys: number[]) => {
    setCheckedKeys(curCheckedKeys);
    form.setFieldsValue({ deptIds: curCheckedKeys });
  };

  const permissonRanaeList = permissonRanaeOptions.map(item => {
    return {
      label: t(item.label),
      value: item.value
    };
  });

  async function getRoleInfo(id: number) {
    const res = await roleInfo(id);
    if (res.data) {
      form.setFieldsValue({
        dataScope: res.data.dataScope,
        roleId: res.data.roleId,
        roleKey: res.data.roleKey,
        roleName: res.data.roleName
      });
    }
  }

  async function getTreeByRoleId(id: number) {
    const res = await roleIdMenuTree(id);
    if (res?.response?.data) {
      form.setFieldsValue({
        deptIds: res?.response?.data.checkedKeys
      });
      setCheckedKeys(res?.response?.data.checkedKeys);
      setExpandedKeys(res?.response?.data.checkedKeys);
      if (Array.isArray(res.response.data.depts)) {
        setTreeData(res.response.data.depts);
      }
    }
  }

  const handDataScopeChange = (val: string) => {
    if (val !== '2') {
      setCheckedKeys([]);
      form.setFieldsValue({
        deptIds: []
      });
    }
  };

  function handleSubmit() {
    onSubmit(form.getFieldsValue());
  }

  useEffect(() => {
    if (roleId) {
      getRoleInfo(roleId);
      getTreeByRoleId(roleId);
    }
  }, [roleId]);

  const roleName = Form.useWatch('roleName', form);
  const roleKey = Form.useWatch('roleKey', form);

  return (
    <ADrawer
      className="role-permission-drawer-v5"
      open={visible}
      title={t('page.manage.role.assignDataPermissions')}
      footer={
        <div className="permission-drawer-footer-v5">
          <AButton className="btn-ghost-v5" onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton
            className="btn-accent-gradient"
            onClick={handleSubmit}
          >
            {t('common.confirm')}
          </AButton>
        </div>
      }
      onClose={onClose}
    >
      {/* 角色信息卡片 */}
      <div className="role-info-card">
        <div className="role-info-icon">
          <SafetyCertificateOutlined />
        </div>
        <div className="role-info-content">
          <div className="role-info-name">{roleName || '-'}</div>
          <div className="role-info-key">{roleKey ? `权限标识：${roleKey}` : '-'}</div>
        </div>
      </div>

      <div className="permission-form-panel">
        <AForm
          form={form}
          initialValues={{ status: '0' }}
          layout="vertical"
        >
          <AForm.Item
            name="roleId"
            style={{ display: 'none' }}
          >
            <AInput disabled />
          </AForm.Item>

          <AForm.Item
            label={t('page.manage.role.roleName')}
            name="roleName"
            rules={[{ required: true }]}
          >
            <AInput
              disabled
              placeholder={t('page.manage.role.form.roleName')}
            />
          </AForm.Item>

          <AForm.Item
            label={t('page.manage.role.permission')}
            name="roleKey"
            rules={[{ required: true }]}
          >
            <AInput
              disabled
              placeholder={t('page.manage.role.form.roleKey')}
            />
          </AForm.Item>

          <AForm.Item
            label={t('page.manage.role.permissionRange')}
            name="dataScope"
            rules={[{ required: true }]}
          >
            <ASelect
              allowClear
              options={permissonRanaeList}
              placeholder={t('page.manage.role.form.permissionRange')}
              onChange={handDataScopeChange}
            />
          </AForm.Item>

          <AForm.Item
            label={t('page.manage.role.dataPermissions')}
            name="deptIds"
            style={{ display: dataScope !== '2' ? 'none' : 'block' }}
          >
            <>
              {checkedKeys.length > 0 && (
                <div className="dept-select-hint">
                  <span className="hint-text">
                    已选择 <strong>{checkedKeys.length}</strong> 个部门
                  </span>
                  <span
                    className="clear-btn"
                    onClick={() => {
                      setCheckedKeys([]);
                      form.setFieldsValue({ deptIds: [] });
                    }}
                  >
                    清空选择
                  </span>
                </div>
              )}
              <ATree
                checkable
                checkedKeys={checkedKeys}
                className="h-280px"
                expandedKeys={expandedKeys}
                treeData={treeData}
                fieldNames={{
                  children: 'children',
                  key: 'id',
                  title: 'label'
                }}
                onCheck={(keys) => handleDeptChange(keys as number[])}
                onExpand={keys => {
                  setExpandedKeys(keys as number[])
                }}
              />
            </>
          </AForm.Item>
        </AForm>
      </div>
    </ADrawer>
  );
};

export default RolePermissionDrawer;
