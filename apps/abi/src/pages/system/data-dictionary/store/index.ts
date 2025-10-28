import { create } from 'zustand';

import type { DictionaryItem } from '../types';

interface StoreType {
  enumInfo: DictionaryItem | null;

  groupInfo: {
    groupName: string;
    groupNameEn?: string;
  };

  setEnumInfo: (enumInfo: DictionaryItem | null) => void;
  setGroupInfo: (groupInfo: { groupName: string; groupNameEn?: string }) => void;
}

export const useDataPreparationStore = create<StoreType>()(set => ({
  enumInfo: null,
  groupInfo: {
    groupName: '',
    groupNameEn: ''
  },
  setEnumInfo: (enumInfo: DictionaryItem | null) => {
    set(state => ({ ...state, enumInfo }));
  },
  setGroupInfo: (groupInfo: { groupName: string; groupNameEn?: string }) => {
    set(state => ({ ...state, groupInfo }));
  }
}));
