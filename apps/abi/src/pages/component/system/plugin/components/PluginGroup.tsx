import React from 'react';

import type { GroupProps } from '@/components/stateful/group/Group.tsx';
import { Group } from '@/components/stateful/group/Group.tsx';

import { pluginGroupConfig } from '../constans/pluginGroupConfig';

interface PluginGroupProps {
  readonly onGroupId: (groupId: number, groupName?: string, groupType?: string) => void;
}

export const PluginGroup: React.FC<PluginGroupProps> = ({ onGroupId }) => {
  return (
    <Group
      config={pluginGroupConfig as unknown as GroupProps['config']}
      onGroupId={onGroupId}
    />
  );
}; 