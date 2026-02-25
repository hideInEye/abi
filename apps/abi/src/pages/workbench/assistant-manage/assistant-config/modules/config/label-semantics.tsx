import { Tooltip, Transfer } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

import { fetchTags } from '@/service/api/assistant-manage';
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

const LabelSemantics: FC<PropsType> = memo(({ dispatch, schemaId, state }) => {
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
    setGroupOptions(res.data.filter((item: any) => item.groupType === 'tag'));
  };

  useEffect(() => {
    getGrouplist();
  }, []);

  const getDataSource = async () => {
    const res = await fetchTags({
      groupId: state.labelsGroupId,
      spaceId: Number(localStorage.getItem('spaceId'))
    });
    const filterResData = res.data.filter((item: any) => item.semanticSchemaId === schemaId);
    setDataSource(filterResData.map((item: any) => ({ key: `${item.tagId}`, title: item.tagName, ...item })));
  };

  useEffect(() => {
    if (state.labelsGroupId) {
      getDataSource();
    }
  }, [state.labelsGroupId, schemaId]);

  const filterOption = (inputValue: string, option: RecordType) => option.title.includes(inputValue);

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    const list = dataSource.filter(item => {
      return item?.key && nextTargetKeys.includes(item.key);
    });
    dispatch({ labels: list.map(item => item.key) });
  };

  return (
    <>
      <div className="my-2">
        <ASelect
          allowClear
          className="mr-2"
          style={{width: 200}}
          fieldNames={{ label: 'groupName', value: 'groupId' }}
          options={groupOptions}
          placeholder="选择标签分组"
          value={state.labelsGroupId}
          onChange={val => dispatch({ labelsGroupId: val })}
        />
      </div>
      <Transfer
        showSearch
        style={{ width: '100%' }}
        dataSource={dataSource}
        filterOption={filterOption}
        render={(item: any) => {
          const text = `${item.engName} - ${item.title}`;
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
        targetKeys={(state?.labels || []).map((k: any) => `${k}`)}
        titles={['可选标签语义', '已选标签语义']}
        listStyle={{
          height: 300,
          width: 'calc((100% - 56px) / 2)'
        }}
        onChange={handleChange}
      />
    </>
  );
});

export default LabelSemantics;
