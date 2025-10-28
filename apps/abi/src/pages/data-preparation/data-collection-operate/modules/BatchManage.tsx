import { CaretRightOutlined } from '@ant-design/icons';
import type { CollapseProps } from 'antd';
import { Collapse } from 'antd';

import { DataCollectionOperateContext } from '../context';
import styles from '../index.module.css';

import EditableTable from './EditableTable';

export interface DataType {
  dimensionality?: number;
  field?: string;
  index?: number;
  isEdit?: boolean;
  key?: string;
  physics_name?: string;
  physics_type?: string;
  remark?: string;
  switchType: 'dimensionality' | 'target';
  table_name?: string;
  type?: string[];
}

// const demoData: DataType[] = [
//   {
//     dimensionality: 1,
//     field: 'id',
//     index: 1,
//     key: '1',
//     physics_name: 'wulimingcheng',
//     physics_type: '1',
//     remark: 'remark',
//     switchType: 'dimensionality',
//     table_name: 'table name',
//     type: ['text'] // 维度 还是 指标
//   },
//   {
//     dimensionality: 2,
//     field: 'id',
//     index: 2,
//     key: '2',
//     physics_name: 'wulimingcheng2',
//     physics_type: '2',
//     remark: 'remark2',
//     switchType: 'target',
//     table_name: 'table name2',
//     type: ['text'] // 维度 还是 指标
//   }
// ];

const BatchManage: React.FC = memo(() => {
  const { allFields } = useContext(DataCollectionOperateContext);

  const items: CollapseProps['items'] = useMemo(() => {
    return [
      {
        children: (
          <EditableTable
            // dataSource={allFields.filter((item: any) => item.tfieldType === 'd')}
            tfieldType="d"
          />
        ),
        className: styles['bottom-left-item-container'],
        key: 'd',
        label: '维度'
      },
      {
        children: (
          <EditableTable
            // dataSource={allFields.filter((item: any) => item.tfieldType === 'q')}
            tfieldType="q"
          />
        ),
        className: styles['bottom-left-item-container'],
        key: 'q',
        label: '指标'
      }
    ];
  }, [allFields]);

  return (
    <Collapse
      bordered={false}
      className={styles['collapse-container']}
      defaultActiveKey={['d', 'q']}
      expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
      items={items}
    />
  );
});

export default BatchManage;
