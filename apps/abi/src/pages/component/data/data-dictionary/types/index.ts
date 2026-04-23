export interface EnumItem {
  id: number;
  label: string;
  remark?: string;
  value: string | number;
}

export interface DictionaryItem {
  createBy: string;
  createTime: string;
  dictField: string;
  dictId: number;
  dictName: string;
  groupId: number;
  remark: string;
  spaceId: number;
  status: string;
  updateBy: string;
  updateTime: string;
}

export interface DictionaryEnumItem {
  createBy: string;
  createTime: string;
  dictCode: number;
  dictField: string;
  dictId: number;
  dictLabel: string;
  dictSort: number;
  dictValue: string;
  remark: string;
  status: string;
  type?: 'add' | 'edit';
  updateBy: string;
  updateTime: string;
}

export interface DictionaryEnumAddItem extends DictionaryEnumItem {
  dictCode: number;
  dictField: string;
  dictId: number;
  dictLabel: string;
  dictSort: number;
  dictValue: string;
  remark: string;
  status: string;
}
