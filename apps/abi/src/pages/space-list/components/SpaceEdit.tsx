import { CloseOutlined } from '@ant-design/icons';
import type { FormInstance } from 'antd';
import { Form, message } from 'antd';
import { useEffect, useState } from 'react';

import { createSpace, updateSpaceInfo } from '@/service/api/data-space';
import { spaceRoleList } from '@/service/api/role';

import { SpaceBasicInfo } from '../modules/SpaceInfoEdit';
import { UserManagement } from '../modules/UserManagement';
import { useSpaceListStore } from '../store';
import type { ISpaceItem } from '../types';

interface SpaceEditProps {
  readonly drawerOpen: boolean;
  readonly editSpace: ISpaceItem | null;
  readonly setDrawerOpen: (open: boolean) => void;
  readonly updateSpace: () => void;
}

export const SpaceEdit = ({ drawerOpen, editSpace, setDrawerOpen, updateSpace }: SpaceEditProps) => {
  const [tabActiveIndex, setTabActiveIndex] = useState(0);
  const { roleData, setAlreadySelectedKeys, setRoleData } = useSpaceListStore();
  const currentUserObj = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}');

  const [form] = Form.useForm();

  function generateSpaceNewData() {
    const obj = {
      owners: '',
      remark: form.getFieldValue('remark'),
      spaceName: form.getFieldValue('spaceName')
    };

    obj.owners = JSON.stringify(roleData);
    return obj;
  }

  function resetForm() {
    form.resetFields();
    setRoleData([]);
    setAlreadySelectedKeys([]);
  }

  const toCreateSpace = async () => {
    const params: any = generateSpaceNewData();
    if (editSpace) {
      const editParams = {
        ...editSpace,
        ...params
      };
      const { response } = await updateSpaceInfo(editParams);
      const { data } = response as any;
      const { code, msg } = data;
      if (code === 200) {
        message.success(msg);
        setDrawerOpen(false);
        updateSpace();
        resetForm();
      } else {
        message.error(msg);
      }
      return;
    }
    const { response } = await createSpace(params);
    const { data } = response as any;
    const { code, msg } = data;
    if (code === 200) {
      message.success(msg);
      setDrawerOpen(false);
      updateSpace();
      resetForm();
    } else {
      message.error(msg);
    }
  };

  useEffect(() => {
    if (drawerOpen) {
      form.resetFields();
      if (editSpace) {
        form.setFieldsValue(editSpace);
      }
      setTabActiveIndex(0);
    }
  }, [editSpace, drawerOpen, form]);

  useEffect(() => {
    if (editSpace) {
      form.setFieldsValue(editSpace);

      const oidList = JSON.parse(editSpace?.owners || '{}').map((i: any) => i.oid);
      setAlreadySelectedKeys(oidList);
      setRoleData(JSON.parse(editSpace?.owners || '{}'));
    } else {
      resetForm();
      setAlreadySelectedKeys([currentUserObj.userId]);

      spaceRoleList({ pageNum: 1, pageSize: 100000 }).then(res => {
        const { data } = res.data as any;
        if (Array.isArray(data)) {
          const createRole = data.find(i => i.roleKey === 'creator');
          if (createRole) {
            setRoleData([
              {
                oid: currentUserObj.userId,
                oname: currentUserObj.userName,
                orgId: currentUserObj.dept.deptId,
                orgName: currentUserObj.dept.deptName,
                recordId: currentUserObj.userUuid,
                otype: 1,
                roles: [
                  {
                    roleId: createRole.roleId,
                    roleName: createRole.roleName
                  }
                ],
                type: 'special-user'
              }
            ]);
          }
        }
      });
    }
  }, [editSpace]);

  const tabsData = [
    {
      children: <SpaceBasicInfo />,
      key: '0',
      label: `基本信息`
    },
    {
      children: <UserManagement />,
      key: '1',
      label: `用户管理`
    }
  ];

  return (
    <ADrawer
      closeIcon={null}
      extra={<CloseOutlined onClick={() => setDrawerOpen(false)} />}
      open={drawerOpen}
      title={editSpace ? '编辑空间' : '新建空间'}
      width={900}
      footer={
        <SpaceDrawerFooter
          formInstance={form}
          setDrawerOpen={setDrawerOpen}
          setTabIndex={setTabActiveIndex}
          tabIndex={tabActiveIndex}
          toCreateSpace={toCreateSpace}
        />
      }
      onClose={() => setDrawerOpen(false)}
    >
      <AForm form={form}>
        <ATabs
          activeKey={tabsData[tabActiveIndex].key}
          defaultActiveKey={tabsData[tabActiveIndex].key}
          items={tabsData.map(item => {
            return {
              children: item.children,
              key: item.key,
              label: item.label
            };
          })}
          onChange={value => {
            setTabActiveIndex(Number(value));
          }}
        />
      </AForm>
    </ADrawer>
  );
};

function SpaceDrawerFooter({
  formInstance,
  setDrawerOpen,
  setTabIndex,
  tabIndex,
  toCreateSpace
}: {
  readonly formInstance: FormInstance<any>;
  readonly setDrawerOpen: (open: boolean) => void;
  readonly setTabIndex: (index: number) => void;
  readonly tabIndex: number;
  readonly toCreateSpace: () => void;
}) {
  const previousStep = () => {
    if (tabIndex === 0) {
      setDrawerOpen(false);
    } else {
      setTabIndex(tabIndex - 1);
    }
  };

  const nextStep = async () => {
    const { error } = await formInstance.validateFields();
    if (error) {
      return;
    }

    if (tabIndex === 1) {
      toCreateSpace();
      return;
    }
    setTabIndex(tabIndex + 1);
  };

  return (
    <AFlex
      className="gap-6 py-6"
      justify="flex-end"
    >
      <AButton
        type="default"
        onClick={previousStep}
      >
        {tabIndex === 0 ? '取消' : '上一步'}
      </AButton>
      <AButton
        type="primary"
        onClick={nextStep}
      >
        {tabIndex < 1 ? '下一步' : '完成'}
      </AButton>
    </AFlex>
  );
}
