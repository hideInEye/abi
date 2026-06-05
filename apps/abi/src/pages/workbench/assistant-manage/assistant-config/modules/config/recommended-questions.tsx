import { Tooltip, Transfer, TreeSelect } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

import { fetchQuestions } from '@/service/api/assistant-manage';
import { grouplist } from '@/service/api/data-table-meaning';
import { buildGroupTree } from '@/pages/workbench/data-preparation/data-table-meaning/utils/helper';
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
    const questionGroups = (res.data || []).filter((item: any) => item.groupType === 'question');
    setGroupOptions(buildGroupTree(questionGroups));
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
        <TreeSelect
          allowClear
          style={{width: 200}}
          className="mr-2"
          treeData={groupOptions}
          fieldNames={{ label: 'groupName', value: 'groupId', children: 'children' }}
          placeholder="选择推荐问题分组"
          value={state.exampleGroupId}
          treeDefaultExpandAll
          onChange={val => dispatch({ exampleGroupId: val })}
        />
      </div>
      <Transfer
        showSearch
        style={{ width: '100%' }}
        dataSource={dataSource}
        filterOption={filterOption}
        render={item => (
          <Tooltip title={item.title}>
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {item.title}
            </span>
          </Tooltip>
        )}
        targetKeys={state?.example}
        titles={['可选问题', '已选问题']}
        listStyle={{
          height: 300,
          width: 'calc((100% - 56px) / 2)'
        }}
        onChange={handleChange}
      />
    </>
  );
});

export default RecommendedQuestions;
