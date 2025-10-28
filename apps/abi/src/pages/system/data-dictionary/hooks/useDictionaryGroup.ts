import { useState, useEffect } from 'react';

import { addDictionary, deleteDictionary, editDictionary, queryDictionary } from '@/service/api/dictionary';

import type { DictionaryItem } from '../types';

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

  const getDictionary = async (search = '') => {
    if (groupId) {
      const res = await queryDictionary({
        groupId,
        pageNum: current,
        pageSize: 10,
        dictName: search
      });
      setDictionaryDataSource(res.response.data as any);
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
  }, [current, groupId]);

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

  const handleSure = async (values: any) => {
    if (editObj) {
      await editDictionary({
        ...editObj,
        ...values
      });
    } else {
      await addDictionary({
        groupId,
        spaceId: localStorage.getItem('spaceId'),
        ...values
      });
    }

    setModalOpen(false);
    setCurrent(1);
    getDictionary(searchValue);
  };

  const handleClose = () => {
    setModalOpen(false);
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
