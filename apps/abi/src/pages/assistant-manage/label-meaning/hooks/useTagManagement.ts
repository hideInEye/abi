import { message } from 'antd';
import { debounce } from 'lodash';
import { useState } from 'react';

import type { Exp, ExpCondition, TagGroup } from '@/pages/assistant-manage/label-meaning/types';
import { addTag, delTag, editTag, queryTag } from '@/service/api/tag-meaning.ts';

export function useTagManagement() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [tagList, setTagList] = useState<TagGroup[]>([]);
  const [groupId, setGroupId] = useState<number>(0);

  const handleDelete = async (id: number) => {
    await delTag({ tagId: id });
    setTagList(prev => prev.filter((item: TagGroup) => item.tagId !== id));
  };

  interface IQueryTag {
    alias?: string;
    createBy?: string;
    engName?: string;
    tagName?: string;
  }

  const getTagList = async(params: IQueryTag) => {
    if (!groupId) {
      return;
    }
    setTagList([]);
    console.log('===');
    
    const queryParams:any = {
      groupId,
      spaceId: Number(localStorage.getItem('spaceId'))
    };

    if (params.tagName) {
      queryParams.tagName = params.tagName;
    }
    const { response } = await queryTag(queryParams);
    const { data } = response.data;
    setTagList(data as TagGroup[]);
  };

  // 标签项更新
  const tagSave = async (values: Partial<TagGroup>) => {
    const metricIds = new Set();
    const { exp } = values;
    const expObj = JSON.parse(decodeURIComponent(exp || '[]'));
    expObj.forEach((item: Exp) => {
      if (item.conditions?.length > 0) {
        item.conditions.forEach((condition: ExpCondition) => {
          metricIds.add(condition.metric);
        });
      }
    });

    if (editingGroup) {
      setTagGroups(prev => prev.map(group => (group.tagId === editingGroup.tagId ? { ...group, ...values } : group)));
      const newTag = {
        ...editingGroup,
        ...values,
        relItemId: metricIds.size > 0 ? Array.from(metricIds).join() : ''
      };

      delete newTag?.updateBy;
      delete newTag?.updateTime;

      await editTag(newTag);
      getTagList({});
    } else {
      if (!groupId) {
        message.error('请选择标签语义组');
        return;
      }

      const newTag: TagGroup = {
        ...(values as TagGroup)
      };
      setTagGroups(prev => [...prev, newTag]);
      await addTag({
        ...newTag,
        groupId,
        relItemId: metricIds.size > 0 ? Array.from(metricIds).join() : '',
        spaceId: Number(localStorage.getItem('spaceId'))
      });
      getTagList({});
    }
    setIsModalOpen(false);
  };

  const handleAdd = () => {
    setIsModalOpen(true);
    setEditingGroup(null);
  };

  const handleEdit = (group: TagGroup) => {
    setIsModalOpen(true);
    const tempTag = {
      ...group,
      viewId: group.viewId
    };
    setEditingGroup(tempTag as any);
  };

  const handleSearch =debounce ((value: string) => {
    getTagList({ tagName: value });
  },500);

  return {
    editingGroup,
    getTagList,
    groupId,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSearch,
    isModalOpen,
    setEditingGroup,
    setGroupId,
    setIsModalOpen,
    setTagList,
    tagGroups,
    tagList,
    tagSave
  };
}
