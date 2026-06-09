import { useState } from 'react';

import {
  addTableSemanticsGroup,
  deleteTableSemanticsGroup,
  editTableSemanticsGroup,
  tableSemanticsGroupList
} from '@/service/api/table-semantics';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';

import type { GroupProps } from './Group';

export interface QuestionGroupItem {
  groupId: number;
  groupName: string;
  groupType: 'question';
  parentId?: number;
  remark: string;
  spaceId: number;
  status: string;
}

export const useGroupManagement = (config: GroupProps['config']) => {
  const spaceId = useAppSelector(getSpaceId);
  const [groups, setGroups] = useState<QuestionGroupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<QuestionGroupItem | null>(null);

  const getGroups = async (searchText?: string) => {
    const { data } = await tableSemanticsGroupList({
      groupName: searchText,
      groupType: config.type,
      pageNum: 1,
      pageSize: 60,
      spaceId
    });
    setGroups(data || []);
  };

  const handleGroupAdd = async (newGroup: QuestionGroupItem & { parentId?: number }) => {
   const res =  await addTableSemanticsGroup({
      groupName: newGroup.groupName,
      groupType: config.type,
      parentId: newGroup.parentId ?? 0,
      remark: newGroup.remark,
      spaceId
    });
    const { response:{data:{code}}} = res
    if(code as number >200) return
    getGroups();
    return true
  };

  const handleGroupEdit = async (updatedItem: QuestionGroupItem) => {
    const res =  await editTableSemanticsGroup(updatedItem);
    const { response:{data:{code}}} = res
    if(code as number >200) return
    getGroups();
    return true
  };

  const handleGroupDelete = async (groupId: number) => {
    // setGroups(prevGroups => prevGroups.filter(group => group.groupId !== groupId));
    await deleteTableSemanticsGroup(groupId);
    getGroups();
  };

  const handleGroupSearch = (searchText: string) => {
    getGroups(searchText);
  };

  return {
    editingGroup,
    getGroups,
    groups,
    handleGroupAdd,
    handleGroupDelete,
    handleGroupEdit,
    handleGroupSearch,
    isModalOpen,
    setEditingGroup,
    setGroups,
    setIsModalOpen
  };
};
