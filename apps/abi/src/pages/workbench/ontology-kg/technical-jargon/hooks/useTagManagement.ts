import { message } from 'antd';
import { useState } from 'react';

import { useAppSelector } from '@/hooks/business/useStore';
import { queryTerms } from '@/service/api/Industry';
import { deleteTerms } from '@/service/api/Industry.ts';
import { assertFlatRequestSuccess, isFlatRequestSuccess } from '@/service/request/flat-result';
import { getSpaceId } from '@/store/slice/app';

import type { TagGroup } from '../types';

export function useTagManagement() {
  const spaceId = useAppSelector(getSpaceId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [terms, setTerms] = useState<TagGroup[]>([]);
  const [groupId, setGroupId] = useState<number>();

  const getTerms = async (key?: string) => {
    if (!groupId) {
      return false;
    }

    const res = await queryTerms({
      groupId,
      spaceId,
      techName: key || ''
    });

    if (!isFlatRequestSuccess(res)) return false;
    const { data } = res;
    setTerms(Array.isArray(data) ? data : []);
    return true;
  };

  const handleAdd = () => {
    setIsModalOpen(true);
    setEditingGroup(null);
  };

  const handleEdit = (group: TagGroup) => {
    setIsModalOpen(true);
    setEditingGroup(group);
  };

  const handleDelete = async (termId: number) => {
    const res = await deleteTerms({
      termId
    });
    assertFlatRequestSuccess(res, res.response?.data?.msg || '删除失败');
    message.success(res.response?.data?.msg || '删除成功');
    setTerms(prev => prev.filter(group => group.termId !== termId));
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    void getTerms(value);
  };

  const handleSave = async (values: Partial<TagGroup>) => {
    if (editingGroup) {
      // 更新现有标签
      setTerms(prev => prev.map(group => (group.termId === editingGroup.termId ? { ...group, ...values } : group)));
    } else {
      // 添加新标签
      const newTag: TagGroup = {
        ...(values as TagGroup)
      };
      setTerms(prev => [...prev, newTag]);
    }
    setIsModalOpen(false);
  };

  return {
    editingGroup,
    getTerms,
    groupId,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSave,
    handleSearch,
    isModalOpen,
    searchValue,
    setEditingGroup,
    setGroupId,
    setIsModalOpen,
    terms
  };
}
