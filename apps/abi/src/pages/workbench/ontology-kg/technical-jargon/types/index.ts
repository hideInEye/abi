export interface TagGroup {
  alias?: string;
  businessDefinition?: string;
  chineseName: string;
  englishName: string;
  expression?: string;
  termId: number;
}

export interface TagManagementProps {
  editingGroup: TagGroup | null;
  isModalOpen: boolean;
  setEditingGroup: (group: TagGroup | null) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}
