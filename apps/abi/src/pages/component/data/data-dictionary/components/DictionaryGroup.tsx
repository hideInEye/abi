import React, { forwardRef } from 'react';

import type { GroupHandle, GroupProps } from '@/components/stateful/group/Group.tsx';
import { Group } from '@/components/stateful/group/Group.tsx';

import { dictionaryGroupConfig } from '../constans/dictionaryGroupConfig';

interface DictionaryGroupProps {
  readonly onGroupId: (groupId: string) => void;
  readonly onGroupsChange?: (hasAnyGroup: boolean | null) => void;
}

export const DictionaryGroup = forwardRef<GroupHandle, DictionaryGroupProps>(({ onGroupId, onGroupsChange }, ref) => {
  return (
    <Group
      ref={ref}
      config={dictionaryGroupConfig as unknown as GroupProps['config']}
      onGroupId={onGroupId}
      onGroupsChange={onGroupsChange}
    />
  );
});

DictionaryGroup.displayName = 'DictionaryGroup';
