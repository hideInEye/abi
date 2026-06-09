import { Tooltip, Transfer } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

import { queryDictionary } from '@/service/api/dictionary';
import { tableSemanticsGroupList } from '@/service/api/table-semantics';
import { useAppSelector } from '@/hooks/business/useStore';
import { getSpaceId } from '@/store/slice/app';
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

const Dictionaries: FC<PropsType> = memo(({ dispatch, state }) => {
  const spaceId = useAppSelector(getSpaceId);
  const [dataSource, setDataSource] = useState<RecordType[]>([]);
  const [groupOptions, setGroupOptions] = useState<any[]>([]);

  const getGroupList = async () => {
    const pageSize = 1000;
    const pageNum = 1;
    const { data } = await tableSemanticsGroupList({
      groupName: '',
      groupType: 'dictionary',
      pageNum,
      pageSize,
      spaceId
    } as any);
    setGroupOptions(data);
  };

  useEffect(() => {
    getGroupList();
  }, [spaceId]);

  const getDataSource = async () => {
    const res = await queryDictionary({
      groupId: state.dictionariesGroupId,
      pageNum: 1,
      pageSize: 1000
    });
    const list = (res.data || []).map((item: any) => ({
      ...item,
      key: `${item.dictId}`,
      title: `${item.dictField}(${item.dictName})${item.remark ? ` - ${item.remark}` : ''}`
    }));
    setDataSource(list as any);
  };

  useEffect(() => {
    if (state.dictionariesGroupId) {
      getDataSource();
    }
  }, [state]);

  const filterOption = (inputValue: string, option: RecordType) => {
    const text = (option.title || '').toLowerCase();
    const query = (inputValue || '').toLowerCase();
    return text.includes(query);
  };

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    const list = dataSource.filter(item => {
      return item?.key && nextTargetKeys.includes(item.key);
    });
    dispatch({ dictgroups: list.map(item => item.key) });
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
          placeholder="选择字典分组"
          value={state.dictionariesGroupId}
          onChange={val => dispatch({ dictionariesGroupId: val })}
        />
      </div>
      <Transfer
        showSearch
        style={{ width: '100%' }}
        dataSource={dataSource}
        filterOption={filterOption}
        render={(item: any) => (
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
        targetKeys={state?.dictgroups}
        titles={['可选数据字典', '已选数据字典']}
        listStyle={{
          height: 300,
          width: 'calc((100% - 56px) / 2)'
        }}
        onChange={handleChange}
      />
    </>
  );
});

export default Dictionaries;
