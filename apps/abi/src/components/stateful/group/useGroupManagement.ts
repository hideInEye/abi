import { useEffect, useState } from 'react';

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
  groupId: string;
  groupName: string;
  groupType: string;
  parentId?: string;
  remark: string;
  spaceId: number;
  status: string;
}

export const useGroupManagement = (config: GroupProps['config']) => {
  const spaceId = useAppSelector(getSpaceId);
  const [groups, setGroups] = useState<QuestionGroupItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<QuestionGroupItem | null>(null);
  // 是否存在分组（null 表示尚未加载完成），供右侧业务区域门控使用
  const [hasAnyGroup, setHasAnyGroup] = useState<boolean | null>(null);

  // 空间切换时重置为未知，避免沿用上个空间的判断结果
  useEffect(() => {
    setHasAnyGroup(null);
  }, [spaceId]);

  const getGroups = async (searchText?: string) => {
    if (!spaceId) return;
    const res = await tableSemanticsGroupList({
      groupName: searchText,
      groupType: config.type,
      pageNum: 1,
      pageSize: 60,
      spaceId
    });
    const list: QuestionGroupItem[] = (res as any)?.data ?? [];
    const safeList = Array.isArray(list) ? list : [];
    setGroups(safeList);
    // 仅在非搜索请求时更新“是否存在分组”，避免搜索无结果被误判为无分组
    if (!searchText) {
      setHasAnyGroup(safeList.length > 0);
    }
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

  const handleGroupDelete = async (groupId: string) => {
    // setGroups(prevGroups => prevGroups.filter(group => group.groupId !== groupId));
    await deleteTableSemanticsGroup(groupId as any);
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
    hasAnyGroup,
    isModalOpen,
    setEditingGroup,
    setGroups,
    setIsModalOpen
  };
};
