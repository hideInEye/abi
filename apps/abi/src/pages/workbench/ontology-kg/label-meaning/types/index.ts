import type { inequalityOptions, logicalOperators } from '../constants';

export interface TagGroup {
  alias: string;
  bizName: string;
  businessDefinition?: string;
  chineseName: string;
  description: string;
  englishName: string;
  engName: string;
  exp: string;
  expression?: string;
  groupId: number | string;
  id: string;
  remark: string;
  relSchemaId?: number | string;
  schemaId?: number | string;
  semanticGroupId?: number | string;
  semanticSchemaId?: number | string;
  semanticsGroupId?: number | string;
  spaceId: number;
  tagId: number;
  tagName: string;
  createBy?: string;
  createTime?: string;
  updateBy?: string;
  updateTime?: string;

  viewId: number | string;
}

export interface TagManagementProps {
  editingGroup: TagGroup | null;
  isModalOpen: boolean;
  setEditingGroup: (group: TagGroup | null) => void;
  setIsModalOpen: (isOpen: boolean) => void;
}

export interface IDataCollection {
  createBy: string;
  createTime: string;
  nodeType: string;
  parentId: number;
  qrtzInstance: string;
  remark: string;
  syncStatus: string;
  unionSql: string;
  updateBy: string;
  updateTime: string;
  viewId: string;
  viewInfo: string;
  viewLevel: number;
  viewMode: number;
  viewName: string;
  viewType: string;
}

export interface IDataCollectionOption {
  label: string;
  value: string;
}

export interface IAllFields {
  accuracy: null;
  checked: null;
  columnIndex: number;
  createTime: string;
  dateFormat: null;
  dateFormatType: null;
  description: string;
  desensitized: null;
  extField: number;
  fieldShortName: string;
  fieldSize: null;
  fieldType: string;
  lastSyncTime: null;
  originName: string;
  params: null;
  rtableId: string;
  sourceId: string;
  sysFiledExtractType: null;
  sysFiledType: number;
  tableName: string;
  tfieldId: string;
  tfieldName: string;
  tfieldShowName: string;
  tfieldType: string;
  updateTime: string;
  viewId: string;
}

export type DimensionItem = {
  originName: string;
  techId: string;
};

export type MeasureItem = {
  originName: string;
  techId: string;
};

export type SourceData = {
  dimensions: DimensionItem[];
  measures: MeasureItem[];
};

export type TreeNode = {
  children?: TreeNode[];
  title: string;
  value: string;
};

export interface ExpCondition {
  logic: (typeof logicalOperators)[number]['value'];
  metric: string;
  operator: (typeof inequalityOptions)[number]['value'];
  value: string;
}

export interface Exp {
  binName: string;
  conditions: ExpCondition[];
  logic: string;
}
