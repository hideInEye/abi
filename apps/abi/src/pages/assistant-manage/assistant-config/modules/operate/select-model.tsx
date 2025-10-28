import { Transfer } from 'antd';
import type { TransferProps } from 'antd';
import type { Dispatch, SetStateAction } from 'react';
import React, { useEffect, useState } from 'react';

import { fetchModelList } from '@/service/api';

interface RecordType {
  chosen: boolean;
  description: string;
  id?: string;
  key?: string;
  title: string;
}
interface PropsType {
  readonly dispatch: (obj: object) => void;
  setHasChange: Dispatch<SetStateAction<boolean>>;
  readonly state: any;
}

const SelectModel: FC<PropsType> = memo(({ dispatch, setHasChange, state }) => {
  const [modelList, setModelList] = useState<RecordType[]>([]);

  const getModelList = async () => {
    const res = await fetchModelList({ pageNum: 1, pageSize: 1000 });
    const filterRes = res.data?.data?.filter((item: any) => item?.status === '1');
    setModelList(filterRes);
  };

  const memoModelList = React.useMemo(() => {
    return modelList.map((item: any) => {
      const key = `${item.llmId}`;
      return {
        ...item,
        disabled: state.llms?.length ? !state.llms.includes(key) : false, // 只能选一个
        key
      };
    });
  }, [modelList, state.llms]);

  useEffect(() => {
    getModelList();
  }, []);

  const filterOption = (inputValue: string, option: RecordType) => option.title.includes(inputValue);

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    // const list = modelList.filter(item => {
    //   return item?.key && nextTargetKeys.includes(item.key);
    // });
    dispatch({ llms: nextTargetKeys });
    setHasChange(true);
  };

  return (
    <Transfer
      showSearch
      dataSource={memoModelList}
      filterOption={filterOption}
      render={(item: any) => item.modelName}
      targetKeys={state.llms}
      titles={['可选大模型', '已选大模型']}
      listStyle={{
        height: 300,
        width: 750
      }}
      onChange={handleChange}
    />
  );
});

export default SelectModel;
