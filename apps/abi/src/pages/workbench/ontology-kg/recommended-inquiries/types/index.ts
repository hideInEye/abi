import type { TableSemanticsGroupType } from '@/service/api/table-semantics.ts';

export interface TagGroup {
  alias?: string;
  businessDefinition?: string;
  chineseName: string;
  englishName: string;
  expression?: string;
  id: string;
}

export interface TagManagementProps {
  editingGroup: TagGroup | null;
  isModalOpen: boolean;
  setEditingGroup: (group: TagGroup | null) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}

export interface QuestionTableData {
  agentId: number;
  agentName: string;
  groupId: number;
  groupName: string;
  groupType: TableSemanticsGroupType;
  problemId: number;
  question: string;
  remark: string;
  spaceId: number;
  status: string;
}
