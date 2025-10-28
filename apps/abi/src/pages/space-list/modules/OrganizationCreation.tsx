import { Button, Transfer } from 'antd';
import type { FormProps, TransferProps } from 'antd';
import React, { useEffect, useState } from 'react';

interface RecordType {
  chosen: boolean;
  description: string;
  key: string;
  title: string;
}

const App: React.FC = () => {
  const [mockData, setMockData] = useState<RecordType[]>([]);
  const [targetKeys, setTargetKeys] = useState<TransferProps['targetKeys']>([]);

  const getMock = () => {
    const tempTargetKeys = [];
    const tempMockData = [];
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 20; i++) {
      const data = {
        chosen: i % 2 === 0,
        description: `description of content${i + 1}`,
        key: i.toString(),
        title: `content${i + 1}`
      };
      if (data.chosen) {
        tempTargetKeys.push(data.key);
      }
      tempMockData.push(data);
    }
    setMockData(tempMockData);
    setTargetKeys(tempTargetKeys);
  };

  useEffect(() => {
    getMock();
  }, []);

  const handleChange: TransferProps['onChange'] = newTargetKeys => {
    setTargetKeys(newTargetKeys);
  };

  const renderFooter: TransferProps['footer'] = (_, info) => {
    if (info?.direction === 'left') {
      return (
        <Button
          size="small"
          style={{ display: 'flex', margin: 8, marginInlineEnd: 'auto' }}
          onClick={getMock}
        >
          Left button reload
        </Button>
      );
    }
    return (
      <Button
        size="small"
        style={{ display: 'flex', margin: 8, marginInlineStart: 'auto' }}
        onClick={getMock}
      >
        Right button reload
      </Button>
    );
  };

  type FieldType = {
    organizationDesc?: string;
    organizationName?: string;
    organizationType?: string;
  };

  const onFinish: FormProps<FieldType>['onFinish'] = values => {
    console.log('Success:', values);
  };

  const onFinishFailed: FormProps<FieldType>['onFinishFailed'] = errorInfo => {
    console.log('Failed:', errorInfo);
  };

  return (
    <AForm
      autoComplete="off"
      initialValues={{ remember: true }}
      name="basic"
      requiredMark={false}
      onFinish={onFinish}
      onFinishFailed={onFinishFailed}
    >
      <ARow justify="space-between">
        <ACol span={11}>
          <AForm.Item<FieldType>
            label="组织名称"
            name="organizationName"
            rules={[{ message: '请输入组织名称', required: true }]}
          >
            <AInput />
          </AForm.Item>
        </ACol>
        <ACol span={11}>
          <AForm.Item<FieldType>
            label="组织描述"
            name="organizationDesc"
            rules={[{ message: '请输入组织描述', required: true }]}
          >
            <AInput />
          </AForm.Item>
        </ACol>
      </ARow>

      <ARow>
        <ACol span={24}>
          <AForm.Item<FieldType>
            label="组织类型"
            name="organizationType"
            rules={[{ message: '请选择组织类型', required: true }]}
          >
            <ASelect options={[{ label: <span>sample</span>, value: 'sample' }]} />
          </AForm.Item>
        </ACol>
      </ARow>

      <ARow>
        <ACol span={24}>
          <AForm.Item label="关联角色">
            <Transfer
              showSearch
              dataSource={mockData}
              footer={renderFooter}
              render={item => `${item.title}-${item.description}`}
              showSelectAll={false}
              targetKeys={targetKeys}
              titles={['可选角色', '已选角色']}
              listStyle={{
                height: 400,
                minWidth: 250
              }}
              onChange={handleChange}
            />
          </AForm.Item>
        </ACol>
      </ARow>
    </AForm>
  );
};

export default App;
