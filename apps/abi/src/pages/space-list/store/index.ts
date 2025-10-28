import { create } from 'zustand';

interface StoreType {
  alreadySelectedKeys: any[];
  currentUser: any;
  generateTableData: (alreadySelectedKeys: number[], treeData: any[]) => any[];
  roleData: any[];
  setAlreadySelectedKeys: (data: any[]) => void;
  setCurrentUser: (data: any) => void;
  setRoleData: (data: any[]) => void;
}

const initialState = {
  alreadySelectedKeys: [],
  currentUser: JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}'),
  roleData: []
};

export const useSpaceListStore = create<StoreType>()(set => ({
  ...initialState,
  // 生成表格数据
  generateTableData: (alreadySelectedKeys: number[], treeData: any[]) => {
    return alreadySelectedKeys.map(key => {
      const deptItem = treeData.find(item => item.deptId === key);
      if (deptItem) {
        return {
          ...deptItem,
          dept: deptItem.deptName,
          roles: '-',
          type: 'dept',
          userName: '-'
        };
      }

      const parentDept = treeData.find(dept => dept.childrenData?.some((u: any) => u.userId === key));
      const userItem = parentDept?.childrenData?.find((u: any) => u.userId === key);
      if (userItem) {
        return {
          ...userItem,
          dept: parentDept.deptName,
          roles: '-',
          type: 'user',
          userName: userItem.userName
        };
      }

      return null;
    });
  },

  setAlreadySelectedKeys: (data: any[]) => {
    set(state => ({ ...state, alreadySelectedKeys: data }));
  },

  setCurrentUser: (data: any) => {
    set(state => ({ ...state, currentUser: data }));
  },

  setRoleData: (data: any[]) => {
    set(state => ({ ...state, roleData: data }));
  }
}));
