import { message } from 'antd';
import { useState } from 'react';

import { addQuestion, deleteQuestion, editQuestion, queryQuestion } from '@/service/api/question.ts';

import type { QuestionTableData } from '../types';

export function useQuestionManagement() {
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
    if (!groupId) return;
    const { pageNum:num = 1, pageSize:size = 5} = p
    setTableData([]);
    const { data } = await queryQuestion({
      groupId,
      question,
      spaceId: Number(localStorage.getItem('spaceId')),
      pageNum:num,
      pageSize: size
    });
    const { list = [], pageNum,total} = data;
    setPagination(p=>({
      ...p,
      total
    }))
    setTableData(list);
  };


  const add = async (question: string, agentId: number) => {
    if (!groupId) return;
    const res =  await addQuestion({
      agentId,
      groupId,
      question,
      spaceId: Number(localStorage.getItem('spaceId'))
    });
    const { response: {data: { code } } } = res
    if(code as number >200){
      return false
    }
    getTableData(searchValue,{...pagination});
    return true
  };

  const del = async (id: number) => {
    const res = await deleteQuestion(id);
    
    if (res.response?.data?.code === 200) {
      message.success(res.response.data.msg || '删除成功');
      getTableData(searchValue,{...pagination});
    } else {
      message.error(res.response?.data?.msg || '删除失败');
    }
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
    const { response:{data:{code}}} = res
    
    if(code as number > 200) {
      return false;
    }
    getTableData(searchValue,{...pagination});
    return true
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
    // setTableData(prev => prev.filter(group => group.groupId !== id));
    await del(id);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    getTableData(value);
  };

  const handleSave = async (values: QuestionTableData) => {
    let flag = true;
    if (editingGroup) {
      // 更新现有标签
      // setTableData(prev =>
      //   prev.map(group => (group.groupId === editingGroup.groupId ? { ...group, ...values } : group))
      // );
      const edObj = {
        agentId: 1,
        groupId: editingGroup.groupId,
        problemId: editingGroup.problemId,
        question: values.question,
        spaceId: editingGroup.spaceId
      };

      flag = !!(await edit(edObj))
      
      if(flag)message.success('编辑成功')
    } else {
      if (!groupId) {
        message.error('请选择标签组');
        return;
      }

      const newTag: QuestionTableData = {
        ...values,
        agentId: 1,
        groupId
      };

      flag =!!(await add(newTag.question, newTag.agentId));
      
      if(flag)message.success('创建成功');
    }
    if(flag) {
      setIsReset(true);
      setIsModalOpen(false);
      getTableData(searchValue,{...pagination})
    }
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
