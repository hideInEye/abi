import { Transfer } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

import { fetchQuestions } from '@/service/api/assistant-manage';
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
  readonly state: any;
}

const RecommendedQuestions: FC<PropsType> = memo(({ dispatch, state }) => {
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
    setGroupOptions(res.data.filter((item: any) => item.groupType === 'question'));
  };

  useEffect(() => {
    getGrouplist();
  }, []);

  const getDataSource = async () => {
    const res = await fetchQuestions({
      groupId: state.exampleGroupId,
      spaceId: Number(localStorage.getItem('spaceId')),
      pageSize: 100,
    });
    setDataSource(res.data?.list?.map((item: any) => ({ key: `${item.problemId}`, title: item.question })));
  };

  useEffect(() => {
    if (state.exampleGroupId) {
      getDataSource();
    }
  }, [state]);

  const filterOption = (inputValue: string, option: RecordType) => option.title.includes(inputValue);

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    const list = dataSource.filter(item => {
      return item?.key && nextTargetKeys.includes(item.key);
    });
    dispatch({ example: list.map(item => item.key) });
  };

  return (
    <>
      <div className="my-2">
        <ASelect
          allowClear
          style={{width: 200}}
          className="mr-2"
          fieldNames={{ label: 'groupName', value: 'groupId' }}
          options={groupOptions}
          placeholder="选择推荐问题分组"
          value={state.exampleGroupId}
          onChange={val => dispatch({ exampleGroupId: val })}
        />
      </div>
      <Transfer
        showSearch
        dataSource={dataSource}
        filterOption={filterOption}
        render={item => item.title}
        targetKeys={state?.example}
        titles={['可选问题', '已选问题']}
        listStyle={{
          height: 300,
          width: 750
        }}
        onChange={handleChange}
      />
    </>
  );
});

export default RecommendedQuestions;
