import { Transfer } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

import { fetchTerms } from '@/service/api/assistant-manage';
import { grouplist } from '@/service/api/data-table-meaning';
// 接口未提供
// import { getAgentConfigDs } from '@/service/api/assistant-manage';

interface RecordType {
  chosen: boolean;
  description: string;
  id?: string;
  key?: string;
  title: string;
}
interface PropsType {
  readonly dispatch: (obj: object) => void;
  readonly schemaId: number;
  readonly state: any;
}

const IndustryTerminology: FC<PropsType> = memo(({ dispatch, schemaId, state }) => {
  const [dataSource, setDataSource] = useState<RecordType[]>([]);
  const [groupOptions, setGroupOptions] = useState<any[]>([]);

  const getGrouplist = async () => {
    const pageSize = 1000;
    const pageNum = 1;
    const res = await grouplist({
      pageNum,
      pageSize,
      spaceId: Number(localStorage.getItem('spaceId'))
    });
    // const res = await grouplist();
    setGroupOptions(res.data.filter((item: any) => item.groupType === 'term'));
  };

  useEffect(() => {
    getGrouplist();
  }, []);

  const getDataSource = async () => {
    const res = await fetchTerms({
      groupId: state.termGroupId,
      spaceId: Number(localStorage.getItem('spaceId')),
      termName: ''
    });
    const filterResData = res.data.filter((item: any) => item.semanticSchemaId === schemaId);
    setDataSource(filterResData.map((item: any) => ({ ...item, key: `${item.termId}`, title: item.techName })));
  };

  useEffect(() => {
    if (state.termGroupId) {
      getDataSource();
    }
  }, [state]);

  const filterOption = (inputValue: string, option: RecordType) => option.title.includes(inputValue);

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    const list = dataSource.filter(item => {
      return item?.key && nextTargetKeys.includes(item.key);
    });
    dispatch({ term: list.map(item => item.key) });
  };

  return (
    <>
      <div className="my-2">
        <ASelect
          allowClear
          className="mr-2"
          fieldNames={{ label: 'groupName', value: 'groupId' }}
          options={groupOptions}
          placeholder="选择术语分组"
          value={state.termGroupId}
          onChange={val => dispatch({ termGroupId: val })}
        />
      </div>
      <Transfer
        showSearch
        dataSource={dataSource}
        filterOption={filterOption}
        render={(item: any) => `${item.title}(${item.termAlias}) - ${item.bizName}`}
        targetKeys={state?.term}
        titles={['可选术语', '已选术语']}
        listStyle={{
          height: 300,
          width: 750
        }}
        onChange={handleChange}
      />
    </>
  );
});

export default IndustryTerminology;
