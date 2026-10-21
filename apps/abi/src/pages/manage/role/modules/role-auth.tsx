import { useRequest } from '@sa/hooks';
import type { DataNode } from 'antd/es/tree';
import { forwardRef, useImperativeHandle } from 'react';

import { getMenuTreeApi } from '@/service/api/role';

import type { ModulesProps } from './type';
import { collectRoleMenuIds, getRoleMenuCheckedKeys } from './menu-selection';

export interface RoleAuthRef {
  getMenuIds: () => (string | number)[] | null;
}

function recursiveTransform(data: Api.SystemManage.MenuTree[] | null): DataNode[] {
  return data
    ? data.map(item => {
      const { id: key, label } = item;

      if (item.children) {
        return {
          children: recursiveTransform(item.children),
          key,
          title: label
        };
      }

      return {
        key,
        title: label
      };
    })
    : [];
}

const RoleAuth = memo(forwardRef<RoleAuthRef, ModulesProps>(({ onChange, value }, ref) => {
  const { data: tree, run: getTree } = useRequest(getMenuTreeApi, {
    manual: true
  });

  function init() {
    getTree();
  }

  useEffect(() => {
    init();
  }, []);

  useImperativeHandle(ref, () => ({
    getMenuIds: () => tree ? collectRoleMenuIds(value, tree) : null
  }), [tree, value]);

  return (
    <ATree
      checkable
      checkedKeys={getRoleMenuCheckedKeys(value, tree || [])}
      className="h-280px"
      height={280}
      treeData={recursiveTransform(tree)}
      onCheck={val => onChange!(val as number[])}
    />
  );
}));

export default RoleAuth;
