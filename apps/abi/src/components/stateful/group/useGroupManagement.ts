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
  groupType: string;
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
    if (!spaceId) return;
    const queryTypes = config.queryTypes && config.queryTypes.length > 0
      ? (config.queryTypes as readonly string[])
      : [config.type];

    // 并发查询所有分组类型，合并结果（单个失败不影响其他）
    const results = await Promise.allSettled(
      queryTypes.map(gt =>
        tableSemanticsGroupList({
          groupName: searchText,
          groupType: gt as any,
          pageNum: 1,
          pageSize: 60,
          spaceId
        })
      )
    );

    const merged: QuestionGroupItem[] = [];
    const seenIds = new Set<number>();
    for (const result of results) {
      if (result.status !== 'fulfilled') continue;
      const res = result.value;
      const list: QuestionGroupItem[] = (res as any)?.data ?? [];
      if (!Array.isArray(list)) continue;
      for (const item of list) {
        if (item.groupId && !seenIds.has(item.groupId)) {
          seenIds.add(item.groupId);
          merged.push(item);
        }
      }
    }
    setGroups(merged);
  };

  const handleGroupAdd = async (newGroup: QuestionGroupItem & { parentId?: number }) => {
   const res =  await addTableSemanticsGroup({
      groupName: newGroup.groupName,
      groupType: (newGroup.groupType || config.type) as any,
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
    const res =  await editTableSemanticsGroup(updatedItem as any);
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
