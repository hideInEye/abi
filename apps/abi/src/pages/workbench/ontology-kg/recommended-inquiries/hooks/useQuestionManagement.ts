import { message } from 'antd';
import { useState } from 'react';

import { useAppSelector } from '@/hooks/business/useStore';
import { addQuestion, deleteQuestion, editQuestion, queryQuestion } from '@/service/api/question.ts';
import { assertFlatRequestSuccess, isFlatRequestSuccess } from '@/service/request/flat-result';
import { getSpaceId } from '@/store/slice/app';

import type { QuestionTableData } from '../types';

export function useQuestionManagement() {
  const spaceId = useAppSelector(getSpaceId);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<QuestionTableData | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [tableData, setTableData] = useState<QuestionTableData[]>([]);
  const [groupId, setGroupId] = useState<number>();
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [isReset, setIsReset] = useState<boolean>(false);
  const [pagination,setPagination] = useState({
    pageNum: 1,
    pageSize: 5,
    total:0
  })

  const defaultPagination = {
    pageNum: 1,
    pageSize: 5,
  }

  const getTableData = async (question = '', p:any = {}) => {
    if (!groupId) return false;
    const { pageNum:num = 1, pageSize:size = 5} = p
    const result = await queryQuestion({
      groupId,
      question,
      spaceId,
      pageNum:num,
      pageSize: size
    });
    if (!isFlatRequestSuccess(result)) return false;
    const data = result.data || {};
    const { list = [], pageNum,total} = data;
    setPagination(p=>({
      ...p,
      total
    }))
    setTableData(list);
    return true;
  };


  const add = async (question: string, agentId: number) => {
    if (!groupId) return false;
    const res =  await addQuestion({
      agentId,
      groupId,
      question,
      spaceId
    });
    return isFlatRequestSuccess(res);
  };

  const del = async (id: number) => {
    const res = await deleteQuestion(id);
    assertFlatRequestSuccess(res, res.response?.data?.msg || '删除失败');
    message.success(res.response?.data?.msg || '删除成功');
    await getTableData(searchValue,{...pagination});
  };

  const edit = async (question: {
    agentId: number;
    groupId: number;
    problemId: number;
    question: string;
    spaceId: number;
  }) => {
    const res =  await editQuestion({
      ...question
    });
    return isFlatRequestSuccess(res);
  };

  const handleAdd = () => {
    if(!groupId) {
      message.error('请先选择分组或创建新分组')
      return;
    }
    setEditingGroup(null);
    setIsModalOpen(true);
    setMode('add');
  };

  const handleEdit = (group: QuestionTableData) => {
    setIsModalOpen(true);
    setEditingGroup(group);
    setMode('edit');
  };

  const handleDelete = async (id: number) => {
    return del(id);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    void getTableData(value);
  };

  const handleSave = async (values: QuestionTableData) => {
    let saved = false;
    if (editingGroup) {
      const edObj = {
        agentId: 1,
        groupId: editingGroup.groupId,
        problemId: editingGroup.problemId,
        question: values.question,
        spaceId: editingGroup.spaceId
      };

      saved = await edit(edObj);
    } else {
      if (!groupId) {
        message.error('请选择标签组');
        return false;
      }

      const newTag: QuestionTableData = {
        ...values,
        agentId: 1,
        groupId
      };

      saved = await add(newTag.question, newTag.agentId);
    }
    if (!saved) return false;

    const refreshed = await getTableData(searchValue, { ...pagination });
    if (!refreshed) return false;
    message.success(editingGroup ? '编辑成功' : '创建成功');
    setIsReset(true);
    return true;
  };

  return {
    editingGroup,
    getTableData,
    groupId,
    handleAdd,
    handleDelete,
    handleEdit,
    handleSave,
    handleSearch,
    isModalOpen,
    isReset,
    mode,
    searchValue,
    setEditingGroup,
    setGroupId,
    setIsModalOpen,
    setMode,
    tableData,
    setPagination,
    pagination
  };
}
