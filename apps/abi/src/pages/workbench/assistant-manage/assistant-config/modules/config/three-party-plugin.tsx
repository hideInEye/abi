import { Tooltip, Transfer } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

import { queryPluginList } from '@/service/api/pulg';
import { grouplist } from '@/service/api/data-table-meaning';
// 接口未提供
// import { getAgentConfigDs } from '@/service/api/assistant-manage';

interface RecordType {
  description?: string;
  key: string;
  title: string;
}
interface PropsType {
  readonly dispatch: (obj: object) => void;
  readonly state: any;
}

const ThreePartyPlugin: FC<PropsType> = memo(({ dispatch, state }) => {
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
    setGroupOptions(res.data.filter((item: any) => item.groupType === 'plugin'));
  };

  useEffect(() => {
    getGrouplist();
  }, []);

  const getDataSource = async () => {
    const res = await queryPluginList({
      pageNum: 1,
      pageSize: 1000,
      pluginName: '',
      spaceId: Number(localStorage.getItem('spaceId')),
      groupId: state.pluginGroupId
    });
    // const res = await fetchPluginList();
    const resData = res.data?.map((item: any) => ({
      ...item,
      key: `${item.pluginId}`,
      title: `${item.pluginName}(${item.pluginType})`
    }));
    setDataSource(resData);
  };

  useEffect(() => {
    if (state.pluginGroupId) {
      getDataSource();
    }
  }, [state.pluginGroupId]);

  const filterOption = (inputValue: string, option: RecordType) => option.title.includes(inputValue);

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    const list = dataSource.filter(item => {
      return item?.key && nextTargetKeys.includes(item.key);
    });
    dispatch({ plugin: list.map(item => item.key) });
  };

  return (
    <>
      <div className="my-2">
        <ASelect
          allowClear
          className="mr-2"
          style={{ width: 200 }}
          fieldNames={{ label: 'groupName', value: 'groupId' }}
          options={groupOptions}
          placeholder="选择插件分组"
          value={state.pluginGroupId}
          onChange={val => dispatch({ pluginGroupId: val })}
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
        targetKeys={state?.plugin}
        titles={['可选插件', '已选插件']}
        listStyle={{
          height: 300,
          width: 'calc((100% - 56px) / 2)'
        }}
        onChange={handleChange}
      />
    </>
  );
});

export default ThreePartyPlugin;
