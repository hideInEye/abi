import { create } from 'zustand';

type TableModalState = {
  nextStep: () => void;
  prevStep: () => void;
  setStepIndex: (stepIndex: number) => void;
  setTableModalOpen: (tableModalOpen: boolean) => void;
  stepIndex: number;
  tableModalOpen: boolean;
};

const createTableModalSlice = (set: any): TableModalState => ({
  nextStep: () =>
    set((state: Store) => ({
      stepIndex: Math.min(state.stepIndex + 1, 1)
    })),
  prevStep: () =>
    set((state: Store) => ({
      stepIndex: Math.max(state.stepIndex - 1, 0)
    })),

  setStepIndex: (stepIndex: number) => set({ stepIndex }),
  setTableModalOpen: (tableModalOpen: boolean) => set({ tableModalOpen }),
  stepIndex: 0,
  tableModalOpen: false
});

type BaseInfoState = {
  chineseName: string;
  dbName: string;
  dbType: string;
  desc: string;
  downSelectLabel: number | null;
  downSelectVal: string | null;
  englishName: string;
  sourceId: string;
  setChinaname: (chinaname: string) => void;
  setDataSourceInfo: (info: { dbName?: string; dbType?: string; sourceId?: string }) => void;
  setDescribe: (describe: string) => void;
  setDownSelectLabel: (downSelectLabel: number) => void;
  setDownSelectVal: (downSelectVal: string) => void;
  setEnglishname: (englishname: string) => void;
};

const createBaseInfoSlice = (set: any): BaseInfoState => ({
  chineseName: '',
  dbName: '',
  dbType: '',
  desc: '',
  downSelectLabel: null,
  downSelectVal: null,
  englishName: '',
  sourceId: '',
  setChinaname: (chineseName: string) => set({ chineseName }),
  setDataSourceInfo: (info: { dbName?: string; dbType?: string; sourceId?: string }) =>
    set((state: BaseInfoState) => ({
      dbName: info.dbName ?? state.dbName,
      dbType: info.dbType ?? state.dbType,
      sourceId: info.sourceId ?? state.sourceId
    })),
  setDescribe: (desc: string) => set({ desc }),
  setDownSelectLabel: (downSelectLabel: number) => set({ downSelectLabel }),
  setDownSelectVal: (downSelectVal: string) => set({ downSelectVal }),
  setEnglishname: (englishName: string) => set({ englishName })
});

type FieldsConfigState = {
  fields: any[];
  setFields: (fields: any[]) => void;
  setUnion: (union: any[]) => void;
  union: any[];
};

const createFieldsConfigSlice = (set: any): FieldsConfigState => ({
  fields: [],
  setFields: (fields: any[]) => set({ fields }),
  setUnion: (union: any[]) => set({ union }),
  union: []
});

type TableConfigState = {
  setTableConfig: (tableConfig: any[]) => void;
  tableConfig: any[];
};

const createTableConfigSlice = (set: any): TableConfigState => ({
  setTableConfig: (tableConfig: any[]) => set({ tableConfig }),
  tableConfig: []
});

type GroupConfigState = {
  groupId: string;
  setGroupId: (groupId: string) => void;
};

const createGroupConfigSlice = (set: any): GroupConfigState => ({
  groupId: '',
  setGroupId: (groupId: string) => set({ groupId })
});

type BaseConfigState = {
  drawerTitle: '新增数据语义' | '编辑数据语义';
  editObj: any;
  setDrawerTitle: (drawerTitle: string) => void;
  setEditObj: (editObj: any) => void;
};

const createBaseConfigSlice = (set: any): BaseConfigState => ({
  drawerTitle: '新增数据语义',
  editObj: {},
  setDrawerTitle: (drawerTitle: string) => set({ drawerTitle }),
  setEditObj: (editObj: any) => set({ editObj })
});

type ResetState = {
  resetStore: () => void;
};

const createResetSlice = (set: any): ResetState => ({
  resetStore: () =>
    set({
      chineseName: '',
      dbName: '',
      dbType: '',
      desc: '',
      downSelectLabel: null,
      downSelectVal: null,
      editObj: {},
      englishName: '',
      fields: [],
      sourceId: '',
      genderOptions: [
        { disabled: false, label: '主键', value: 'primary_key' },
        { disabled: false, label: '维度', value: 'categorical' },
        { disabled: false, label: '日期', value: 'datetime' },
        { disabled: false, label: '度量', value: 'measure' }
      ],
      tableConfig: []
    })
});

type FormState = {
  formBaseInfo: any;
  formFieldsConfig: any;
  // 第二步保存前的全量校验器：返回首个错误的字段 key（供滚动定位），无错返回 null
  tableConfigValidator: null | (() => Promise<string | null>);
  setFormBaseInfo: (formBaseInfo: any) => void;
  setFormFieldsConfig: (formFieldsConfig: any) => void;
  setTableConfigValidator: (tableConfigValidator: null | (() => Promise<string | null>)) => void;
};

const createFormSlice = (set: any): FormState => {
  return {
    formBaseInfo: {},
    formFieldsConfig: {},
    tableConfigValidator: null,
    setFormBaseInfo: (formBaseInfo: any) => set({ formBaseInfo }),
    setFormFieldsConfig: (formFieldsConfig: any) => set({ formFieldsConfig }),
    setTableConfigValidator: (tableConfigValidator: null | (() => Promise<string | null>)) => set({ tableConfigValidator })
  };
};

type GenderOptionsState = {
  genderOptions: any[];
  resetGenderOptionsDisabled: () => void;
  setIdentifiersDisabled: (identifiersDisabled: boolean) => void;
};

const createGenderOptionsSlice = (set: any): GenderOptionsState => ({
  genderOptions: [
    { disabled: false, label: '主键', value: 'primary_key' },
    { disabled: false, label: '维度', value: 'categorical' },
    { disabled: false, label: '日期', value: 'datetime' },
    { disabled: false, label: '度量', value: 'measure' }
  ],
  resetGenderOptionsDisabled: () =>
    set({
      genderOptions: [
        { disabled: false, label: '主键', value: 'primary_key' },
        { disabled: false, label: '维度', value: 'categorical' },
        { disabled: false, label: '日期', value: 'datetime' },
        { disabled: false, label: '度量', value: 'measure' }
      ]
    }),
  setIdentifiersDisabled: (identifiersDisabled: boolean) =>
    set((state: Store) => ({
      genderOptions: state.genderOptions.map((option: { disabled: boolean; value: string }) => ({
        ...option,
        disabled: option.value === 'primary_key' ? identifiersDisabled : option.disabled
      }))
    }))
});

interface ITablePrikey {
  checked: boolean;
  extField: number;
  fieldType: string;
  inCount: number;
  jsonPath: null | string;
  length: null | number;
  name: string;
  originName: string;
  precision: number;
  primary: boolean;
  rtableId: null | string;
  scale: number;
  size: number;
  sourceId: string;
  sysFiledExtractType: null | string;
  sysFiledType: number;
  tableName: string;
  tfieldType: string;
  type: string;
  value: null | any;
  viewId: null | string;
}

type ITablePrikeyMap = {
  setTablePrikey: (tablePrikey: any) => void;
  tablePrikey: ITablePrikey[];
};

const createTablePrikey = (set: any): ITablePrikeyMap => {
  return {
    setTablePrikey: (tablePrikey: any) => set({ tablePrikey }),
    tablePrikey: []
  };
};

type Store = TableModalState &
  BaseInfoState &
  FieldsConfigState &
  TableConfigState &
  GroupConfigState &
  BaseConfigState &
  ResetState &
  FormState &
  GenderOptionsState &
  ITablePrikeyMap;

export const useTableStore = create<Store>()(set => ({
  ...createTableModalSlice(set),
  ...createBaseInfoSlice(set),
  ...createFieldsConfigSlice(set),
  ...createTableConfigSlice(set),
  ...createGroupConfigSlice(set),
  ...createBaseConfigSlice(set),
  ...createResetSlice(set),
  ...createFormSlice(set),
  ...createGenderOptionsSlice(set),
  ...createTablePrikey(set)
}));
