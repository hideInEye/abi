/*
 * @Author: kangxiaozhong kangxiaozhong@trusfort.com
 * @Date: 2025-11-10 15:39:09
 * @LastEditors: kangxiaozhong kangxiaozhong@trusfort.com
 * @LastEditTime: 2025-11-12 08:51:43
 * @FilePath: /trust-abi-web/chatbi/src/pages/assistant-manage/assistant-config/modules/operate/select-model.tsx
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Tooltip, Transfer, message } from 'antd';
import type { TransferProps } from 'antd';
import type { Dispatch, FC, SetStateAction } from 'react';
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
  readonly state: any;
}

const SelectModel: FC<PropsType> = memo(({ dispatch,  state }) => {
  const [modelList, setModelList] = useState<RecordType[]>([]);

  const getModelList = async () => {
    const res = await fetchModelList({ pageNum: 1, pageSize: 1000 });
    const filterRes = res.data?.data?.filter((item: any) => item?.status === '1');
    setModelList(filterRes);
  };

  const memoModelList = React.useMemo(() => {
    return modelList.map((item: any) => {
      const key = `${item.llmId}`;
      const title = item.modelName || '';
      const description = item.modelType || '';
      return {
        ...item,
        disabled: false,
        key,
        title,
        description
      };
    });
  }, [modelList]);

  useEffect(() => {
    getModelList();
  }, []);

  const filterOption = (inputValue: string, option: RecordType) => {
    const text = (option.title || (option as any).modelName || '').toLowerCase();
    const desc = (option.description || '').toLowerCase();
    const query = (inputValue || '').toLowerCase();
    return text.includes(query) || desc.includes(query);
  };

  const handleChange: TransferProps['onChange'] = nextTargetKeys => {
    // 只在选择时验证：每种类型的模型只能选择一个
    const selectedModels = modelList.filter((item: any) => 
      nextTargetKeys.includes(`${item.llmId}`)
    );
    
    const llmModels = selectedModels.filter((item: any) => item.modelType === 'llm');
    const embeddingModels = selectedModels.filter((item: any) => item.modelType === 'embedding');
    
    // 检查每种类型是否只选择了一个模型
    if (llmModels.length > 1) {
      message.error('仅支持1个大模型选中');
      return;
    }
    
    if (embeddingModels.length > 1) {
      message.error('仅支持1个嵌入模型选中');
      return;
    }
    
    // 更新选择
    dispatch({ llms: nextTargetKeys });
  };

  return (
    <Transfer
      showSearch
      style={{ width: '100%' }}
      dataSource={memoModelList}
      filterOption={filterOption}
      render={(item: any) => {
        const typeMap: Record<string, string> = {
          llm: '大模型',
          embedding: '嵌入模型'
        };
        const typeLabel = typeMap[item.modelType] || '';
        const text = `${item.modelName}${typeLabel ? `（${typeLabel}）` : ''}`;
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
      targetKeys={state.llms}
      titles={['可选大模型', '已选大模型']}
      listStyle={{
        height: 300,
        width: 'calc((100% - 56px) / 2)'
      }}
      onChange={handleChange}
    />
  );
});

export default SelectModel;
