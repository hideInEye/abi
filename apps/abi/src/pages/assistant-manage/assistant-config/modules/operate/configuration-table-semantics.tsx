import { Transfer } from 'antd';
import type { TransferProps } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import React, { useEffect, useState } from 'react';

import { SEMANTIC_TYPE_MAP } from '@/constants/assistant-config';
import { tableSemanticsGroupList } from '@/service/api/table-semantics';

import { useSchemaFields } from './useSchemaFields';
// import { deleteTableSemantics, schemalist } from '@/service/api/data-table-meaning';
// 接口未提供
// import { getAgentConfigDs } from '@/service/api/assistant-manage';
interface PropsType {
  readonly dispatch: (obj: object) => void;
  setHasChange: Dispatch<SetStateAction<boolean>>;
  readonly state: any;
}

// const tempMockData: any[] = [
//   {
//     description: 'deepseek-r1',
//     id: '1',
//     key: '1',
//     title: 'deepseek-r1'
//   },
//   {
//     description: '文新一言',
//     id: '2',
//     key: '2',
//     title: '文新一言'
//   }
// ];

const ConfigurationTableSemantics: FC<PropsType> = memo(({ dispatch, setHasChange, state }) => {
  const [groupOptions, setGroupOptions] = useState<any[]>([]);
  const { fieldsDataSource: dataSource, schemaOptions } = useSchemaFields(state);
  const [targets, setTargets] = useState<any[]>([]);

  const getGrouplist = async () => {
    const pageSize = 1000;
    const pageNum = 1;
    const res = await tableSemanticsGroupList({
      groupType: 'shema',
      pageNum,
      pageSize,
      spaceId: Number(localStorage.getItem('spaceId'))
    });
    // const res = await grouplist();
    setGroupOptions(res.data);
  };

  useEffect(() => {
    getGrouplist();
  }, []);

  useEffect(() => {
    // 初始加载时，回显选中数据
    if (dataSource?.length) {
      setTargets(state.tableSemantics || []);
    }
  }, [dataSource, state]);

  const filterOption = (inputValue: string, option: any) => {
    const title = `${option.fieldName}(${option.bizName}) - ${option.type}`;
    return title.includes(inputValue);
  };

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    const list = dataSource.filter((item: any) => {
      return nextTargetKeys.includes(item.techId);
    });
    dispatch({ tableSemantics: list });
    setHasChange(true);
  };

  return (
    <>
      <div className="my-2">
        <ASelect
          allowClear
          className="mr-2 w-150px"
          fieldNames={{ label: 'groupName', value: 'groupId' }}
          options={groupOptions}
          placeholder="选择表语义组"
          value={state.groupId}
          onChange={val => {
            dispatch({ groupId: val, schemaId: undefined, tableSemantics: [] });
          }}
        />
        <ASelect
          allowClear
          className="w-150px"
          fieldNames={{ label: 'bizName', value: 'schemaId' }}
          options={schemaOptions}
          placeholder="选择表语义"
          value={state.schemaId}
          onChange={val => {
            dispatch({ schemaId: val, tableSemantics: [] });
          }}
        />
      </div>
      <Transfer
        showSearch
        dataSource={dataSource}
        filterOption={filterOption}
        render={item => `${item.fieldName}(${item.bizName}) - ${SEMANTIC_TYPE_MAP[item.paramType]}`}
        targetKeys={targets.map((item: any) => item.techId)}
        titles={['可选数据集表语义字段', '已选表语义字段']}
        listStyle={{
          height: 300,
          width: 750
        }}
        onChange={handleChange}
      />
    </>
  );
});

export default ConfigurationTableSemantics;
