import { AndroidOutlined, AppleOutlined } from '@ant-design/icons';

import type { ISpaceItem } from '../types';

import { SpaceBasicInfo } from './SpaceInfoEdit';
import { UserManagement } from './UserManagement';

interface SpaceFeatureSetProps {
  readonly editSpace: ISpaceItem | null;
  readonly setTabIndex: (index: number) => void;
  readonly tabIndex: number;
}

export default function SpaceFeatureSet({ editSpace, setTabIndex, tabIndex }: SpaceFeatureSetProps) {
  const tabs = [
    {
      children: (
        <SpaceBasicInfo editSpace={editSpace} />
      ),
      icon: <AppleOutlined />,
      key: '0',
      label: `基本信息`
    },
    {
      children: <UserManagement />,
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
