import React from 'react';

import type { GroupProps } from '@/components/stateful/group/Group.tsx';
import { Group } from '@/components/stateful/group/Group.tsx';

import { dictionaryGroupConfig } from '../constans/dictionaryGroupConfig';

interface DictionaryGroupProps {
  readonly onGroupId: (groupId: string) => void;
}

export const DictionaryGroup: React.FC<DictionaryGroupProps> = ({ onGroupId }) => {
  return (
    <Group
      config={dictionaryGroupConfig as unknown as GroupProps['config']}
      onGroupId={onGroupId}
    />
  );
};
