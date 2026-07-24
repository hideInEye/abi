import { useState, useEffect } from 'react';

import { addDictionary, deleteDictionary, editDictionary, queryDictionary } from '@/service/api/dictionary';

import type { DictionaryItem } from '../types';
import { FormInstance, message } from 'antd';

export const useDictionaryGroup = (groupId: string) => {
  const [current, setCurrent] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editObj, setEditObj] = useState<DictionaryItem | null>(null);
  const [searchValue, setSearchValue] = useState('');

  const [dictionaryDataSource, setDictionaryDataSource] = useState<{
    code: number;
    msg: string;
    rows: DictionaryItem[];
    total: number;
  }>({
    code: 0,
    msg: '',
    rows: [],
    total: 0
  });

  const getDictionary = async (search = '', queryGroupId = groupId) => {
    if (queryGroupId) {
      // 一次性拉取全量数据，前端做时间筛选与分页
      const res = await queryDictionary({
        groupId: queryGroupId,
        pageNum: 1,
        pageSize: 100000,
        dictField: search
      });
      // 防止快速切换时旧请求响应覆盖新数据
      if (queryGroupId === groupId) {
        setDictionaryDataSource(res.response.data as any);
      }
    }
  };

  useEffect(() => {
    setDictionaryDataSource({
      code: 0,
      msg: '',
      rows: [],
      total: 0
    });
    getDictionary(searchValue);
  }, [groupId]);

  const handleAdd = () => {
    setEditObj(null);
    setModalOpen(true);
  };

  const handleUpdateStatus = async (record: DictionaryItem) => {
    await editDictionary({
      ...record,
      status: record.status === '2' ? '1' : '2'
    });
    setCurrent(1);
    getDictionary(searchValue);
  };

  const handleEdit = (values: DictionaryItem) => {
    setEditObj(values);
    setModalOpen(true);
  };

  const handleDelete = async (dictId: number) => {
    await deleteDictionary(dictId);
    setCurrent(1);
    getDictionary(searchValue);
  };

  const handleSure = async (values: any,form:FormInstance) => {
    let res:any = {}
    if(editObj) {
     res =   await editDictionary({
        ...editObj,
        ...values
      });
    } else {
     res=  await addDictionary({
        groupId,
        spaceId: localStorage.getItem('spaceId'),
        ...values
      });
    }

    if(res.response.data.code >200) {
      message.error(res.response.data.msg)
      return
    }
    message.success('创建成功')
    form.resetFields();
    setModalOpen(false);
    setCurrent(1);
    getDictionary(searchValue);
  };

  const handleClose = () => {
    setModalOpen(false);
    setEditObj(null);
  };

  const handleSearch = (value: string) => {
    setSearchValue(value);
    setCurrent(1); // 搜索时重置到第一页
    getDictionary(value);
  };

  return {
    current,
    dictionaryDataSource,
    editObj,
    handleAdd,
    handleClose,
    handleDelete,
    handleEdit,
    handleSure,
    handleSearch,
    handleUpdateStatus,
    modalOpen,
    searchValue,
    setCurrent
  };
};
