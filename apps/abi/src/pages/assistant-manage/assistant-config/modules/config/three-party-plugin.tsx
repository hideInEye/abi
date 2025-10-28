import { Transfer } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

import { queryPluginList } from '@/service/api/pulg';
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

  const getDataSource = async () => {
    const res = await queryPluginList({
      pageNum: 1,
      pageSize: 1000,
      pluginName: '',
      spaceId: Number(localStorage.getItem('spaceId'))
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
    getDataSource();
  }, []);

  const filterOption = (inputValue: string, option: RecordType) => option.title.includes(inputValue);

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    const list = dataSource.filter(item => {
      return item?.key && nextTargetKeys.includes(item.key);
    });
    dispatch({ plugin: list.map(item => item.key) });
  };

  return (
    <Transfer
      showSearch
      dataSource={dataSource}
      filterOption={filterOption}
      render={item => item.title}
      targetKeys={state?.plugin}
      titles={['可选插件', '已选插件']}
      listStyle={{
        height: 300,
        width: 750
      }}
      onChange={handleChange}
    />
  );
});

export default ThreePartyPlugin;
