import { Form, message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useState, useEffect } from 'react'

import { enableStatusRecord } from '@/constants/business'
import { assignUserUnallocatedList } from '@/service/api/role'

// 定义类型接口
interface RolePermissioDrawerProps {
  onClose: () => void
  onSubmit: (params: any) => Promise<void>
  roleId: number | string // 修改返回类型
  visible: boolean
}
type ReadonlyRolePermissioDrawerProps = Readonly<RolePermissioDrawerProps>

const MultiSelectTableDrawer: React.FC<ReadonlyRolePermissioDrawerProps> = ({ roleId, visible, onClose, onSubmit }) => {
  const { t } = useTranslation()

  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 })
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  const columns = [
    {
      align: 'center',
      dataIndex: 'userName',
      key: 'userName',
      title: t('page.manage.user.userName'),
    },
    {
      align: 'center',
      dataIndex: 'nickName',
      key: 'nickName',
      title: t('page.manage.user.nickName'),
    },
    {
      align: 'center',
      dataIndex: 'email',
      key: 'email',
      title: t('page.manage.common.email'),
    },
    {
      align: 'center',
      dataIndex: 'phonenumber',
      key: 'phonenumber',
      title: t('page.manage.user.phonenumber'),
    },
    {
      align: 'center',
      dataIndex: 'status',
      key: 'status',
      render: (_: unknown, record: { status: Api.Common.EnableStatus }) => {
        const label = t(enableStatusRecord[record.status])
        if (record.status === '0') {
          return <ATag color="success">{label}</ATag>
        }
        return <ATag color="error">{label}</ATag>
      },
      title: t('page.manage.role.status'),
    },
    {
      align: 'center',
      dataIndex: 'createTime',
      key: 'createTime',
      title: t('page.manage.role.createTime'),
      width: 200,
    },
  ]

  const fetchData = async (params: any) => {
    setLoading(true)
    try {
      const curparams = {
        pageNum: params.current,
        pageSize: params.pageSize,
        roleId,
        ...form.getFieldsValue(),
      }

      const res: any = await assignUserUnallocatedList(curparams)
      if (res?.response?.data?.rows) {
        const { rows, total } = res.response.data
        setData(rows)
        setPagination((prev) => ({
          ...prev,
          total,
        }))
      }
    } catch (error) {
      message.error('获取列表数据失败')

      // eslint-disable-next-line
      console.error('Fetch list error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleTableChange = (newPagination: any) => {
    setPagination(newPagination)
    fetchData(newPagination)
  }

  const rowSelection = {
    onChange: (selectedKeys: React.Key[]) => {
      setSelectedRowKeys(selectedKeys)
    },
    selectedRowKeys,
  }

  function handleSubmit() {
    onSubmit(selectedRowKeys)
  }

  const onReset = () => {
    form.resetFields()
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchData({
      current: 1,
      pageSize: pagination.pageSize,
      total: pagination.total,
    })
  }

  const onSearch = () => {
    setPagination((prev) => ({ ...prev, current: 1 }))
    fetchData({
      current: 1,
      pageSize: pagination.pageSize,
      total: pagination.total,
    })
  }

  // 初始化加载数据
  useEffect(() => {
    if (roleId) {
      setData([])
      setSelectedRowKeys([])
      setPagination((prev) => ({ ...prev, current: 1 }))

      if (visible) {
        fetchData(pagination)
      }
    }
  }, [roleId, visible])

  return (
    <CommonDrawer
      open={visible}
      title={t('page.manage.role.selectUser')}
      width={1000}
      footer={
        <AFlex gap={20} justify="flex-end">
          <AButton onClick={onClose}>{t('common.cancel')}</AButton>
          <AButton type="primary" onClick={handleSubmit}>
            {t('common.confirm')}
          </AButton>
        </AFlex>
      }
      onClose={onClose}
    >
      <AForm
        form={form}
        labelCol={{
          md: 7,
          span: 5,
        }}
      >
        <ARow wrap gutter={[16, 16]}>
          <ACol lg={6} md={12} span={24}>
            <AForm.Item className="m-0" label={t('page.manage.user.userName')} name="userName">
              <AInput placeholder={t('page.manage.user.form.userName')} />
            </AForm.Item>
          </ACol>

          <ACol lg={6} md={12} span={24}>
            <AForm.Item className="m-0" label={t('page.manage.user.phonenumber')} name="phonenumber">
              <AInput placeholder={t('page.manage.user.form.phonenumber')} />
            </AForm.Item>
          </ACol>

          <ACol lg={6} md={12} span={24} />

          <ACol lg={6} md={12} span={24}>
            <AFlex align="center" gap={12} justify="end">
              <AButton icon={<IconIcRoundRefresh />} onClick={onReset}>
                {t('common.reset')}
              </AButton>
              <AButton ghost icon={<IconIcRoundSearch />} type="primary" onClick={onSearch}>
                {t('common.search')}
              </AButton>
            </AFlex>
          </ACol>
        </ARow>
      </AForm>

      <ATable columns={columns} dataSource={data} loading={loading} pagination={pagination} rowKey="userId" rowSelection={rowSelection} scroll={{ y: 600 }} onChange={handleTableChange} />
    </CommonDrawer>
  )
}

export default MultiSelectTableDrawer
