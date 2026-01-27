import { Steps } from 'antd';
import React from 'react';

const items = [
  {
    title: '基本信息'
  },
  {
    title: '字段选择'
  },
  {
    title: '表语义配置'
  }
];
interface DataTableMeaningProps {
  data: number;
}
const DataTableMeaning: React.FC<DataTableMeaningProps> = (props: any) => {
  const { data } = props;
  return (
    <ARow
      className="py5"
      justify="center"
    >
      <ACol>
        <Steps
          current={data}
          items={items}
          labelPlacement="vertical"
        />
      </ACol>
    </ARow>
  );
};

export default DataTableMeaning;
