import { useRequest } from '@sa/hooks';
import type { DataNode } from 'antd/es/tree';

import { getMenuTreeApi } from '@/service/api/role';

import type { ModulesProps } from './type';

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

const RoleAuth: FC<ModulesProps> = memo(({ onChange, value }) => {
  const { data: tree, run: getTree } = useRequest(getMenuTreeApi, {
    manual: true
  });

  function init() {
    getTree();
  }

  useEffect(() => {
    init();
  }, []);

  return (
    <ATree
      checkable
      checkedKeys={value}
      className="h-280px"
      height={280}
      treeData={recursiveTransform(tree)}
      onCheck={val => onChange!(val as number[])}
    />
  );
});

export default RoleAuth;
