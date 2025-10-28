import { Form } from 'antd';

import { permissonRanaeOptions } from '@/constants/business';
import { roleIdMenuTree, roleInfo } from '@/service/api/role';

interface RolePermissioDrawerProps {
  roleId: number;
  visible: boolean;
  onClose: () => void;
  onSubmit: (params: any) => Promise<void>;
}

const RoleOperateDrawer: React.FC<RolePermissioDrawerProps> = ({ roleId, visible, onClose, onSubmit }) => {
  const { t } = useTranslation();

  const [form] = AForm.useForm();

  const [treeData, setTreeData] = useState([]);

  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<number[]>([]);

  const dataScope = Form.useWatch('dataScope', form); // 监听 menuType

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
    const res: any = await roleIdMenuTree(id);
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

  return (
    <ADrawer
      open={visible}
      title={t('page.manage.role.assignDataPermissions')}
      footer={
        <AFlex justify="space-between">
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton
            type="primary"
            onClick={handleSubmit}
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
          name="roleId"
          style={{ display: 'none' }} // 隐藏字段
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
            onCheck={handleDeptChange}
            onExpand={keys => {
              setExpandedKeys(keys)
            }}
          />
        </AForm.Item>
      </AForm>
    </ADrawer>
  );
};

export default RoleOperateDrawer;
