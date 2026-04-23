import { Button, Drawer, Table, Tabs, TabsProps } from "antd";
import React, { useEffect, useState } from "react";
import { fetchAgentInfoById, fetchDatasourceById, fetchSchemaById } from "../../service/api/app";
import SvgIcon from "../../components/SvgIcon";
import { CloseOutlined } from "@ant-design/icons";

interface PropsType {
  onClose: () => void;
  id: number;
};

const mockDataArray = [
  {
      dataModel: "userInfo",
      englishName: "UserService",
      interfaceProtocol: "HTTP/1.1",
      serviceAddress: "https://example.com/api/user",
      createTime: "2024-10-01 12:00:00"
  },
  {
      dataModel: "productDetails",
      englishName: "ProductService",
      interfaceProtocol: "HTTP/2",
      serviceAddress: "https://example.com/api/product",
      createTime: "2024-10-01 13:00:00"
  },
  {
      dataModel: "orderSummary",
      englishName: "OrderService",
      interfaceProtocol: "HTTPS",
      serviceAddress: "https://example.com/api/order",
      createTime: "2024-10-01 14:00:00"
  }
];

const AgentInfoModal: React.FC<PropsType> = React.memo(({ onClose, id }) => {
  const [agentInfo, setAgentInfo] = useState<any>();
  const [tab, setTab] = useState('1');
  const [dataSource, setDataSource] = useState<any[]>(mockDataArray);
  const [schema, setSchema] = useState<any[]>([]);

  const items: TabsProps['items'] = [
    {
      children: (
        <Table
          dataSource={dataSource}
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            {
              dataIndex: 'dataModel',
              key: 'dataModel',
              title: '数据模型'
            },
            {
              dataIndex: 'englishName',
              key: 'englishName',
              title: '英文名称'
            },
            {
              dataIndex: 'interfaceProtocol',
              key: 'interfaceProtocol',
              title: '接口协议',
              width: 100
            },
            {
              dataIndex: 'serviceAddress',
              key: 'serviceAddress',
              title: '服务地址'
            },
            {
              dataIndex: 'createTime',
              key: 'createTime',
              title: '创建时间'
            }
          ]}
        />
      ),
      key: '1',
      label: (
        <div className="flex items-center">
          <SvgIcon
            className="mr-2"
            localIcon="model"
          />
          <span>模型信息</span>
        </div>
      )
    },
    {
      children: (
        <Table
          dataSource={schema}
          pagination={false}
          columns={[
            {
              dataIndex: 'bizName',
              key: 'bizName',
              title: '表语义名称'
            },
            {
              dataIndex: 'techName',
              key: 'techName',
              title: '英文名称'
            },
            {
              dataIndex: 'viewName',
              key: 'viewName',
              title: '数据集'
            },
            {
              dataIndex: 'createBy',
              key: 'createBy',
              title: '创建人'
            },
            {
              dataIndex: 'createTime',
              key: 'createTime',
              title: '创建时间'
            }
          ]}
        />
      ),
      key: '2',
      label: (
        <div className="flex items-center">
          <SvgIcon
            className="mr-2"
            localIcon="schema"
          />
          <span>表语义</span>
        </div>
      )
    }
  ];

  const getSchema = async () => {
    // const res: any = await fetchSchemaById(id);
    const res: any = await fetchSchemaById(id);
    setSchema(res.rows);
  };

  const getDataSource = async () => {
    // const res: any = await fetchDatasourceById(id);
    const res: any = await fetchDatasourceById(3);
    setDataSource(res);
  };

  const getAgentInfo = async () => {
    const res = await fetchAgentInfoById(id);
    setAgentInfo(res.data);
  };

  useEffect(() => {
    getAgentInfo();
  }, []);

  useEffect(() => {
    if (tab === '2') {
      getSchema();
    } else {
      // getDataSource()
    }
  }, [tab]);

  return (
    <Drawer
      closeIcon={false}
      open={true}
      size="large"
      extra={
        <Button
          icon={<CloseOutlined />}
          type="text"
          onClick={() => onClose()}
        />
      }
      title={
        <div>
          <span>{agentInfo?.agentAlias}</span>
          <br />
          <sub>{agentInfo?.remark}</sub>
        </div>
      }
      onClose={onClose}
    >
      <Tabs
        activeKey={tab}
        className="mt-[-20px]"
        items={items}
        onChange={tab => setTab(tab)}
      />
    </Drawer>
  );
})

export default AgentInfoModal
