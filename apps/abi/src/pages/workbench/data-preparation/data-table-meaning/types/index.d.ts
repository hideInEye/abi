export interface groupitem {
  createBy: string;
  createTime: string;
  groupId: number;
  groupName: string;
  groupType: string;
  level: number;
  parentId: number;
  remark: string;
  sortOrder: number;
  spaceId: number;
  status: string;
  updateBy: string;
  updateTime: string;
}

export interface groupitemfa {
  groupId: number;
  groupName: string;
}

export interface DataType {
  address: string;
  age: number;
  key: string;
  name: string;
  schemaId: number;
  tags: string[];
}

export interface DataTypea {
  age: number;
  alias: string;
  bizName: string;
  fieldDesc: string;
  fieldType: string;
  gender?: string;
  key: string;
  name: string;
  semanticType: string;
  tfieldId: string;
  tfieldName: string;
  tableName: string;
  originName: string;
}

export interface DataSourceItem {
  description: string;
  key: string;

  tfieldId: string;
  tfieldShowName: string;
  title: string;
}

export interface OutputField {
  dataType: string;
  fieldName: string;
}

export interface Measure {
  agg: string;
  alias: string;
  bizName: string;
  expand: Record<string, any>;
  expr: string;
  fieldDesc: string;
  fieldName: string;
  fieldType: string;
  isCreateMetric: number;
  originName: string;
  primaryKey: string;
  rtableName: string;
  sourceId: string;
  tableName: string;
  tdesc: string;
  techId: string;
  techName: string;
  tfieldId: string;
  tfieldName: string;
  type: string;
}

export interface Dimension {
  bizName: string;
  dateFormat?: string;
  expand: Record<string, any>;
  fieldName: string;
  isCreateDimension?: number;
  techId: string;
  techName: string;
  type: string;
}

export interface InputField {
  agg: string;
  alias: string;
  bizName: string;
  dataType: string;
  description: string;
  expand: Record<string, any>;
  expr: string;
  fieldDesc: string;
  fieldName: string;
  fieldType: string;
  isCreateDimension: number;
  isCreateMetric: number;
  originName: string;
  primaryKey?: string;
  rtableName?: string;
  semanticType?: 'categorical' | 'datetime' | 'measure' | 'primary_key';
  sourceId?: string;
  tableName?: string;
  tdesc: string;
  techId: string;
  techName: string;
  tfieldId: string;
  tfieldName: string;
  type: string;
  rtableId?:string;
  tableRemarks?:string;
}

export interface TableNames {
  tableName: string;
  rtableId: string;
}

export interface OutputData {
  dimensions: Dimension[];
  fields: OutputField[];
  identifiers: Dimension[];
  measures: Measure[];
  tableNames: TableNames[];
}

export type TableSemanticParams = {
  bizName: string;
  drillDim: null;
  filters: null;
  groupId: number | null | string;
  modelDetail: string;
  relViewId: string;
  remark: string;
  schemaId: string;
  spaceId: string;
  status: string;
  techName: string;
};
