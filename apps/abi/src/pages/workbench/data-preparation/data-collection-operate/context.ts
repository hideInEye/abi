import { createContext } from 'react';

export interface DataCollectionOperateContextType {
  allFields: any;
  curDatasourceType?: string;
  datasource: any;
  nodeData: any;
  setAllFields: (data: any) => void;
  setNodeData: (data: any) => void;
}

export const DataCollectionOperateContext = createContext({} as DataCollectionOperateContextType);
