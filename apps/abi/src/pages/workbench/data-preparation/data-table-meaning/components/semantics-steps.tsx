import { Steps } from 'antd';
import React from 'react';

const items = [
  {
    title: '基本信息与字段选择'
  },
  {
    title: '数据语义配置'
  }
];
interface DataTableMeaningProps {
  data: number;
}
const DataTableMeaning: React.FC<DataTableMeaningProps> = (props: any) => {
  const { data } = props;
  return (
    <div className="ds-steps-wrapper">
      <Steps
        current={data}
        items={items}
        labelPlacement="vertical"
        size="small"
      />
    </div>
  );
};

export default DataTableMeaning;
