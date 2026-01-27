import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { TabsProps } from 'antd';
import { Tabs } from 'antd';
import { cloneDeep } from 'lodash';
import React from 'react';

import { getPreviewData } from '@/service/api';
import { getAllFieldsByNodeData } from '@/utils/data-collection-operate';

import { DataCollectionOperateContext } from '../context';
import styles from '../index.module.css';

import BatchManage from './BatchManage';
import CalculatedFieldModal from './CalculatedFieldModal';
import DataPreview from './DataPreview';

// interface PropsType {}

const BottomTabs: React.FC = memo(({curDatasource}: any) => {
  const { allFields, nodeData, setAllFields } = useContext(DataCollectionOperateContext);
  const [previewData, setPreviewData] = useState<any>({});
  const [createCalculatedField, setCreateCalculatedField] = useState(false);

  useEffect(() => {
    const fields = getAllFieldsByNodeData(nodeData);
    setAllFields((state: any) => {
      if (state?.length) {
        state.forEach((item: any) => {
          // 如果是计算字段，则补充上
          if (item.extField === 2) {
            fields.push(item);
          }
        });
      }
      return fields;
    });
  }, [nodeData]);

  const items: TabsProps['items'] = [
    {
      children: <DataPreview previewData={previewData} />,
      key: '1',
      label: '数据预览'
    },
    // {
    //   children: <BatchManage />,
    //   key: '2',
    //   label: '批量管理'
    // }
  ];

  const handlePreview = async () => {
    const res = await getPreviewData({ allFields, union: [nodeData],sourceType:curDatasource?.sourceType });
    if (res.data) setPreviewData(res.data);
  };

  const onClose = (values?: any) => {
    if (values) {
      setAllFields((state: any) => {
        const newData = cloneDeep(state);
        newData.push(values);
        // const index = newData.findIndex((item: any) => values?.tfieldId === item.tfieldId);
        // const item = newData[index];
        // newData.splice(index, 1, {
        //   ...item,
        //   ...values
        // });
        return newData;
      });
    }
    setCreateCalculatedField(false);
  };

  return (
    <div className="relative h-full">
      <Tabs
        className={styles['bottom-tabs-container']}
        defaultActiveKey="1"
        items={items}
        tabBarExtraContent={<span className="ml-2">(说明: 参与预览计算的数据最多100行,原数据不足100行则取全量数据,超过则抽取样数据)</span>}
      />
      <div className="absolute right-10px top-8px">
        {/* <AButton
          className="mr-2"
          disabled={!allFields.length}
          icon={<PlusOutlined className="text-12px" />}
          size="small"
          onClick={() => setCreateCalculatedField(true)}
        >
          新建计算字段
        </AButton> */}
        <AButton
          disabled={!allFields.length}
          icon={<ReloadOutlined className="text-12px" />}
          size="small"
          onClick={handlePreview}
        >
          刷新数据
        </AButton>
      </div>

      {createCalculatedField ? <CalculatedFieldModal onClose={onClose} /> : null}
    </div>
  );
});

export default BottomTabs;
