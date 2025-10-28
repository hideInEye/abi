import { useState } from 'react';

import { queryTerms } from '@/service/api/Industry';
import { deleteTerms } from '@/service/api/Industry.ts';

import type { TagGroup } from '../types';

export function useTagManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [terms, setTerms] = useState<TagGroup[]>([]);
  const [groupId, setGroupId] = useState<number>();

  const getTerms = async (key?: string) => {
    if (!groupId) {
      return;
    }

    setTerms([]);
    const res = await queryTerms({
      groupId,
      spaceId: Number(localStorage.getItem('spaceId')),
      techName: key || ''
    });

    const { data } = res;
    setTerms(data);
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
    setTerms(prev => prev.filter(group => group.termId !== termId));
    await deleteTerms({
      termId
    });
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    getTerms(value);
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
