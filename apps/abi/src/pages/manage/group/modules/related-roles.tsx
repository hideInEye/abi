import { Transfer } from 'antd';
import type { TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

interface ModulesProps {
  onChange?: (val: TransferProps['targetKeys']) => void;
  value?: TransferProps['targetKeys'];
}

interface RecordType {
  chosen: boolean;
  description: string;
  key: string;
  title: string;
}
const RelatedRoles: FC<ModulesProps> = memo(({ onChange, value }) => {
  const [mockData, setMockData] = useState<RecordType[]>([]);

  const getMock = () => {
    // const tempTargetKeys = [];
    // const tempMockData = [];
    // for (let i = 0; i < 20; i++) {
    //   const data = {
    //     chosen: i % 2 === 0,
    //     description: `description of content${i + 1}`,
    //     key: i.toString(),
    //     title: `content${i + 1}`
    //   };
    //   if (data.chosen) {
    //     tempTargetKeys.push(data.key);
    //   }
    //   tempMockData.push(data);
    // }
    // setMockData(tempMockData);
    setMockData([]);
    // onChange!(tempTargetKeys);
  };

  useEffect(() => {
    getMock();
  }, []);

  const filterOption = (inputValue: string, option: RecordType) => option.description.includes(inputValue);

  const handleChange: TransferProps['onChange'] = newTargetKeys => {
    onChange!(newTargetKeys);
  };

  return (
    <Transfer
      showSearch
      className="w-full"
      dataSource={mockData}
      filterOption={filterOption}
      render={item => item.title}
      targetKeys={value}
      titles={['可选角色', '已选角色']}
      onChange={handleChange}
      // onSearch={handleSearch}
    />
  );
});

export default RelatedRoles;
