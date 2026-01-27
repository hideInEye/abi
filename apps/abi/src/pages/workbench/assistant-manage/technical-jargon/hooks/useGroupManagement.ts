import { useState } from 'react';

import type { GroupItem } from '@/pages/assistant-manage/label-meaning/components/GroupList';

export const useGroupManagement = () => {
  const [groups, setGroups] = useState<GroupItem[]>([
    { tagId: 1, tagName: '标签 1' },
    { tagId: 2, tagName: '标签 2' }
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupItem | null>(null);

  const handleGroupSearch = (searchText: string) => {
    console.log(searchText);
  };

  const handleGroupEdit = (updatedItem: GroupItem) => {
    setGroups(prevGroups => prevGroups.map(group => (group.tagId === updatedItem.tagId ? updatedItem : group)));
    console.log(updatedItem, '编辑');
  };

  const handleGroupDelete = (tagId: number) => {
    setGroups(prevGroups => prevGroups.filter(group => group.tagId !== tagId));
    console.log(tagId, '删除');
  };

  const handleGroupAdd = (newGroup: GroupItem) => {
    setGroups(prevGroups => [...prevGroups, newGroup]);
    console.log(newGroup, '添加');
  };

  return {
    editingGroup,
    groups,
    handleGroupAdd,
    handleGroupDelete,
    handleGroupEdit,
    handleGroupSearch,
    isModalOpen,
    setEditingGroup,
    setIsModalOpen
  };
};
