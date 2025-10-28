import { create } from 'zustand';

import { fetchGetRoleOption } from '@/service/api';

interface StoreType {
  loadRoleOptions: () => void;
  onenetPortalManageMenus: any[];
  roleOptions: CommonType.Option<number>[];
  roleOptionsMap: Map<number, string>;
  setOnenetPortalManageMenus: (arr: any[]) => void;
}

const initialState = {
  onenetPortalManageMenus: [],
  roleOptions: [],
  roleOptionsMap: new Map()
};

export const useSystemStore = create<StoreType>()(set => ({
  ...initialState,
  loadRoleOptions: () => {
    fetchGetRoleOption().then(res => {
      const _roleOptionsMap = new Map();
      const roleOptions = res.data?.map((item: any) => {
        _roleOptionsMap.set(item.roleId, item.roleName);
        return { label: item.roleName, value: item.roleId };
      });
      set(state => ({ ...state, roleOptions }));
    });
  },
  setOnenetPortalManageMenus: (arr: any[]) => {
    set(state => {
      return {
        ...state,
        onenetPortalManageMenus: arr
      };
    });
  }
}));
