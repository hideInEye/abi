import { create } from 'zustand';

type GroupModalState = {
  groupModalOpen: boolean;
  setGroupModalOpen: (groupModalOpen: boolean) => void;
};

type GroupEditingState = {
  editAddGroup: number;
  editGroupItem: any;
  setEditAddGroup: (editAddGroup: number) => void;
  setEditGroupItem: (editGroupItem: any) => void;
};

type TableSemanticsState = {
  setTableSemanticsGroup: (tableSemanticsGroup: any[]) => void;
  tableSemanticsGroup: any[];
};

type Store = GroupModalState & GroupEditingState & TableSemanticsState;

const createGroupModalSlice = (set: any): GroupModalState => ({
  groupModalOpen: false,
  setGroupModalOpen: (groupModalOpen: boolean) => set({ groupModalOpen })
});

const createGroupEditingSlice = (set: any): GroupEditingState => ({
  editAddGroup: 1,
  editGroupItem: {},
  setEditAddGroup: (editAddGroup: number) => set({ editAddGroup }),
  setEditGroupItem: (editGroupItem: any) => set({ editGroupItem })
});

const createTableSemanticsSlice = (set: any): TableSemanticsState => ({
  setTableSemanticsGroup: (tableSemanticsGroup: any[]) => set({ tableSemanticsGroup }),
  tableSemanticsGroup: []
});

export const useTableSemanticsStore = create<Store>()(set => ({
  ...createGroupModalSlice(set),
  ...createGroupEditingSlice(set),
  ...createTableSemanticsSlice(set)
}));
