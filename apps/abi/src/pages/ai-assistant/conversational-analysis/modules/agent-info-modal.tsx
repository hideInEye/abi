import { CloseOutlined } from '@ant-design/icons'
import type { TabsProps } from 'antd'
import { Table, Tabs } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useEffect, useState } from 'react'

import { fetchAgentInfoById, fetchDatasourceById, fetchSchemaById } from '@/service/api/app'

/**
 * AI 助手信息详情模态框组件
 * 显示助手的模型信息和表语义信息
 * 支持分 Tab 页展示不同类型的详细信息
 */
interface PropsType {
  id: number // 助手ID
  onClose: () => void // 关闭回调函数
}

const mockDataArray = [
  {
    createTime: '2024-10-01 12:00:00',
    dataModel: 'userInfo',
    englishName: 'UserService',
    interfaceProtocol: 'HTTP/1.1',
    serviceAddress: 'https://example.com/api/user',
  },
  {
    createTime: '2024-10-01 13:00:00',
    dataModel: 'productDetails',
    englishName: 'ProductService',
    interfaceProtocol: 'HTTP/2',
    serviceAddress: 'https://example.com/api/product',
  },
  {
    createTime: '2024-10-01 14:00:00',
    dataModel: 'orderSummary',
    englishName: 'OrderService',
    interfaceProtocol: 'HTTPS',
    serviceAddress: 'https://example.com/api/order',
  },
]

const AgentInfoModal: React.FC<PropsType> = memo(({ id, onClose }) => {
  const [agentInfo, setAgentInfo] = useState<any>()
  const [tab, setTab] = useState('1')
  const [dataSource, setDataSource] = useState<any[]>(mockDataArray)
  const [schema, setSchema] = useState<any[]>([])

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
              title: '数据模型',
            },
            {
              dataIndex: 'englishName',
              key: 'englishName',
              title: '英文名称',
            },
            {
              dataIndex: 'interfaceProtocol',
              key: 'interfaceProtocol',
              title: '接口协议',
              width: 100,
            },
            {
              dataIndex: 'serviceAddress',
              key: 'serviceAddress',
              title: '服务地址',
            },
            {
              dataIndex: 'createTime',
              key: 'createTime',
              title: '创建时间',
            },
          ]}
        />
      ),
      key: '1',
      label: (
        <div className="flex items-center">
          <SvgIcon className="mr-2" localIcon="model" />
          <span>模型信息</span>
        </div>
      ),
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
              title: '表语义名称',
            },
            {
              dataIndex: 'techName',
              key: 'techName',
              title: '英文名称',
            },
            {
              dataIndex: 'viewName',
              key: 'viewName',
              title: '数据集',
            },
            {
              dataIndex: 'createBy',
              key: 'createBy',
              title: '创建人',
            },
            {
              dataIndex: 'createTime',
              key: 'createTime',
              title: '创建时间',
            },
          ]}
        />
      ),
      key: '2',
      label: (
        <div className="flex items-center">
          <SvgIcon className="mr-2" localIcon="schema" />
          <span>表语义</span>
        </div>
      ),
    },
  ]

  const getSchema = async () => {
    // const res: any = await fetchSchemaById(id);
    const res: any = await fetchSchemaById(id)
    setSchema(res.data)
  }

  const getDataSource = async () => {
    // const res: any = await fetchDatasourceById(id);
    const res: any = await fetchDatasourceById(3)
    setDataSource(res)
  }

  const getAgentInfo = async () => {
    const res = await fetchAgentInfoById(id)
    setAgentInfo(res.data)
  }

  useEffect(() => {
    getAgentInfo()
  }, [])

  useEffect(() => {
    if (tab === '2') {
      getSchema()
    } else {
      // getDataSource()
    }
  }, [tab])

  return (
    <CommonDrawer open={true} size="large" description={agentInfo?.remark} title={agentInfo?.agentAlias} onClose={onClose}>
      <Tabs activeKey={tab} className="mt-[-20px]" items={items} onChange={(tab) => setTab(tab)} />
    </CommonDrawer>
  )
})

export default AgentInfoModal
