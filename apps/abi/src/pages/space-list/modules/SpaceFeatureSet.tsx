import { AndroidOutlined, AppleOutlined } from '@ant-design/icons';

import type { ISpaceItem } from '../types';

import RoleManagement from './UserManagement';
import { SpaceInfoEdit } from './SpaceInfoEdit';

interface SpaceFeatureSetProps {
  readonly editSpace: ISpaceItem | null;
  readonly setTabIndex: (index: number) => void;
  readonly tabIndex: number;
}

export default function SpaceFeatureSet({ editSpace, setTabIndex, tabIndex }: SpaceFeatureSetProps) {
  const tabs = [
    {
      children: (
        <SpaceInfoEdit
          description={editSpace?.remark ?? ''}
          name={editSpace?.spaceName ?? ''}
        />
      ),
      icon: <AppleOutlined />,
      key: '0',
      label: `基本信息`
    },
    {
      children: <RoleManagement />,
      icon: <AndroidOutlined />,
      key: '1',
      label: `角色管理`
    }
  ];
  return (
    <ATabs
      activeKey={tabs[tabIndex].key}
      defaultActiveKey={tabs[tabIndex].key}
      items={tabs.map(item => {
        return {
          children: item.children,
          icon: item.icon,
          key: item.key,
          label: item.label
        };
      })}
      onChange={value => {
        setTabIndex(Number(value));
      }}
    />
  );
}
