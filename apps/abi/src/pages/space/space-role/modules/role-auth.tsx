import type { DataNode } from 'antd/es/tree';
import type { FC } from 'react';
import { memo } from 'react';

import type { ModulesProps } from './type';

const RoleAuth: FC<ModulesProps> = memo(({ onChange, value, treeData }) => {
  return (
    <ATree
      checkable
      checkedKeys={value}
      className="h-280px"
      height={280}
      treeData={treeData}
      onCheck={val => onChange!(val as number[])}
    />
  );
});

export default RoleAuth;