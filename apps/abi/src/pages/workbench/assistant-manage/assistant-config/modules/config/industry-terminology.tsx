import { Tooltip, Transfer, TreeSelect } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

import { fetchTerms } from '@/service/api/assistant-manage';
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
    const termGroups = (res.data || []).filter((item: any) => item.groupType === 'term');
    setGroupOptions(buildGroupTree(termGroups));
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
    const filterResData = (res.data || []).filter((item: any) => item.semanticSchemaId === schemaId);
    setDataSource(filterResData.map((item: any) => ({ ...item, key: `${item.termId}`, title: item.bizName })));
  };

  useEffect(() => {
    if (state.termGroupId) {
      getDataSource();
    }
  }, [state.termGroupId, schemaId]);

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
        <TreeSelect
          allowClear
          style={{width: 200}}
          className="mr-2"
          treeData={groupOptions}
          fieldNames={{ label: 'groupName', value: 'groupId', children: 'children' }}
          placeholder="选择术语分组"
          value={state.termGroupId}
          treeDefaultExpandAll
          onChange={val => dispatch({ termGroupId: val })}
        />
      </div>
      <Transfer
        showSearch
        style={{ width: '100%' }}
        dataSource={dataSource}
        filterOption={filterOption}
        render={(item: any) => {
          const text = `${item.techName} - ${item.title}`;
          return (
            <Tooltip title={text}>
              <span
                style={{
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {text}
              </span>
            </Tooltip>
          );
        }}
        targetKeys={(state?.term || []).map((k: any) => `${k}`)}
        titles={['可选术语', '已选术语']}
        listStyle={{
          height: 300,
          width: 'calc((100% - 56px) / 2)'
        }}
        onChange={handleChange}
      />
    </>
  );
});

export default IndustryTerminology;
