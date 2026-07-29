import React, { forwardRef } from 'react';

import type { GroupHandle, GroupProps } from '@/components/stateful/group/Group.tsx';
import { Group } from '@/components/stateful/group/Group.tsx';

import { pluginGroupConfig } from '../constans/pluginGroupConfig';

interface PluginGroupProps {
  readonly onGroupId: (groupId: string, groupName?: string) => void;
  readonly onGroupsChange?: (hasAnyGroup: boolean | null) => void;
}

export const PluginGroup = forwardRef<GroupHandle, PluginGroupProps>(({ onGroupId, onGroupsChange }, ref) => {
  return (
    <Group
      ref={ref}
      config={pluginGroupConfig as unknown as GroupProps['config']}
      onGroupId={onGroupId}
      onGroupsChange={onGroupsChange}
    />
  );
});

PluginGroup.displayName = 'PluginGroup';
