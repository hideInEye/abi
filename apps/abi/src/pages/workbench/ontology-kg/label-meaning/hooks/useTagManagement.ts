import { message } from 'antd';
import { debounce } from 'lodash';
import { useState } from 'react';

import { useAppSelector } from '@/hooks/business/useStore';
import { collectRuleFieldIds } from '@/pages/workbench/ontology-kg/label-meaning/components/rule-expression';
import { parseTagExpression } from '@/pages/workbench/ontology-kg/label-meaning/components/semantic-tag/tagExpression';
import type { TagGroup } from '@/pages/workbench/ontology-kg/label-meaning/types';
import { addTag, delTag, editTag, queryTag } from '@/service/api/tag-meaning.ts';
import { assertFlatRequestSuccess, isFlatRequestSuccess } from '@/service/request/flat-result';
import { getSpaceId } from '@/store/slice/app';

export function useTagManagement() {
  const spaceId = useAppSelector(getSpaceId) || 0;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TagGroup | null>(null);
  const [tagGroups, setTagGroups] = useState<TagGroup[]>([]);
  const [tagList, setTagList] = useState<TagGroup[]>([]);
  const [groupId, setGroupId] = useState<string>('');

  const handleDelete = async (id: number) => {
    const result = await delTag({ tagId: id });
    assertFlatRequestSuccess(result);
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
      return false;
    }
    const queryParams:any = {
      groupId,
      spaceId
    };

    if (params.tagName) {
      queryParams.tagName = params.tagName;
    }
    const result = await queryTag(queryParams);
    if (!isFlatRequestSuccess(result)) return false;
    const data = result.data ?? result.response?.data?.data;
    setTagList(Array.isArray(data) ? data as TagGroup[] : []);
    return true;
  };

  // 标签项更新
  const tagSave = async (values: Partial<TagGroup>) => {
    const { exp } = values;
    const metricIds = collectRuleFieldIds(parseTagExpression(exp));

    if (editingGroup) {
      const newTag = {
        ...editingGroup,
        ...values,
        relItemId: metricIds.join()
      };

      delete newTag?.updateBy;
      delete newTag?.updateTime;

      const result = await editTag(newTag);
      if (!isFlatRequestSuccess(result)) return false;
      setTagGroups(prev => prev.map(group => (group.tagId === editingGroup.tagId ? { ...group, ...values } : group)));
    } else {
      if (!groupId) {
        message.error('请选择标签语义组');
        return false;
      }

      const newTag: TagGroup = {
        ...(values as TagGroup)
      };
      const result = await addTag({
        ...newTag,
        groupId,
        relItemId: metricIds.join(),
        spaceId
      });
      if (!isFlatRequestSuccess(result)) return false;
      setTagGroups(prev => [...prev, newTag]);
    }
    return getTagList({});
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
    void getTagList({ tagName: value });
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
