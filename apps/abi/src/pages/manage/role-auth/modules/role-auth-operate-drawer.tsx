import { LeftOutlined, ReloadOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons'
import { Form, message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useEffect, useState } from 'react'

import { enableStatusRecord } from '@/constants/business'
import { assignUserUnallocatedList } from '@/service/api/role'

// 定义类型接口
interface RolePermissioDrawerProps {
  onClose: () => void
  onSubmit: (params: any) => Promise<void>
  roleId: number | string
  visible: boolean
}
type ReadonlyRolePermissioDrawerProps = Readonly<RolePermissioDrawerProps>

const MultiSelectTableDrawer: React.FC<ReadonlyRolePermissioDrawerProps> = ({ roleId, visible, onClose, onSubmit }) => {
  const { t } = useTranslation()

  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState([])
  const [pageNum, setPageNum] = useState(1)
  const [pageSizeVal, setPageSizeVal] = useState(10)
  const [total, setTotal] = useState(0)
  const [jumpValue, setJumpValue] = useState('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [searchUserName, setSearchUserName] = useState('')
  const [searchPhone, setSearchPhone] = useState('')

  const columns = [
    {
      align: 'center',
      dataIndex: 'userName',
      key: 'userName',
      minWidth: 120,
      title: t('page.manage.user.userName'),
    },
    {
      align: 'center',
      dataIndex: 'nickName',
      key: 'nickName',
      minWidth: 120,
      title: t('page.manage.user.nickName'),
    },
    {
      align: 'center',
      dataIndex: 'email',
      key: 'email',
      minWidth: 150,
      title: t('page.manage.common.email'),
    },
    {
      align: 'center',
      dataIndex: 'phonenumber',
      key: 'phonenumber',
      minWidth: 130,
      title: t('page.manage.user.phonenumber'),
    },
    {
      align: 'center' as const,
      dataIndex: 'status',
      key: 'status',
      render: (_: any, record: any) => {
        const label = t(enableStatusRecord[record.status as Api.Common.EnableStatus])
        if (record.status === '0') {
          return <ATag color="success">{label}</ATag>
        }
        return <ATag color="error">{label}</ATag>
      },
      title: t('page.manage.role.status'),
      width: 100,
    },
    {
      align: 'center',
      dataIndex: 'createTime',
      key: 'createTime',
      minWidth: 160,
      title: t('page.manage.role.createTime'),
    },
  ]

  const fetchData = async (params: any) => {
    setLoading(true)
    try {
      const curParams = {
        pageNum: params.pageNum,
        pageSize: params.pageSize,
        roleId,
        ...form.getFieldsValue(),
      }

      const res: any = await assignUserUnallocatedList(curParams)
      if (res?.response?.data?.rows) {
        const { rows, total: totalCount } = res.response.data
        setData(rows)
        setTotal(totalCount)
      }
    } catch (error) {
      message.error('获取列表数据失败')
      // eslint-disable-next-line
      console.error('Fetch list error:', error)
    } finally {
      setLoading(false)
    }
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

  // Search handlers
  const handleSearch = () => {
    form.setFieldsValue({
      userName: searchUserName.trim(),
      phonenumber: searchPhone.trim(),
    })
    setPageNum(1)
    fetchData({
      pageNum: 1,
      pageSize: pageSizeVal,
    })
  }

  const handleReset = () => {
    setSearchUserName('')
    setSearchPhone('')
    form.resetFields()
    setPageNum(1)
    fetchData({
      pageNum: 1,
      pageSize: pageSizeVal,
    })
  }

  // Pagination logic
  const totalPages = Math.ceil(total / pageSizeVal) || 1

  const handlePageSizeChange = (value: number) => {
    setPageSizeVal(value)
    setPageNum(1)
    fetchData({
      pageNum: 1,
      pageSize: value,
    })
  }

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setPageNum(page)
      fetchData({
        pageNum: page,
        pageSize: pageSizeVal,
      })
    }
  }

  const handlePrev = () => {
    if (pageNum > 1) handlePageChange(pageNum - 1)
  }
  const handleNext = () => {
    if (pageNum < totalPages) handlePageChange(pageNum + 1)
  }

  const handleJump = () => {
    const page = parseInt(jumpValue, 10)
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page)
      setJumpValue('')
    }
  }

  const renderPageNumbers = () => {
    const pages: (number | string)[] = []
    const maxVisible = 5
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else if (pageNum <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i)
      pages.push('...', totalPages)
    } else if (pageNum >= totalPages - 2) {
      pages.push(1, '...')
      for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i)
    } else {
      pages.push(1, '...')
      pages.push(pageNum - 1, pageNum, pageNum + 1)
      pages.push('...', totalPages)
    }
    return pages.map((page, idx) => {
      if (page === '...')
        return (
          <span key={`ellipsis-${idx}`} className="page-item page-ellipsis">
            ...
          </span>
        )
      const isActive = page === pageNum
      return (
        <span key={page} className={`page-item ${isActive ? 'page-active' : ''}`} onClick={() => handlePageChange(page as number)}>
          {page}
        </span>
      )
    })
  }

  // 初始化加载数据
  useEffect(() => {
    if (roleId) {
      setData([])
      setSelectedRowKeys([])
      setPageNum(1)

      if (visible) {
        fetchData({ pageNum: 1, pageSize: pageSizeVal })
      }
    }
  }, [roleId, visible])

  return (
    <CommonDrawer
      open={visible}
      title={t('page.manage.role.selectUser')}
      width={1000}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <AButton className="btn-ghost-v5" onClick={onClose}>
            {t('common.cancel')}
          </AButton>
          <AButton className="btn-accent-gradient" onClick={handleSubmit}>
            {t('common.confirm')}
          </AButton>
        </div>
      }
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {/* Searchbar */}
        <section className="abi-searchbar">
          <div className="abi-search-row">
            <AInput
              allowClear
              placeholder={t('page.manage.user.form.userName')}
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              value={searchUserName}
              onChange={(e) => setSearchUserName(e.target.value)}
              onPressEnter={handleSearch}
              className="abi-field-input"
              style={{ width: '200px' }}
            />
            <AInput
              allowClear
              placeholder={t('page.manage.user.form.phonenumber')}
              prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              onPressEnter={handleSearch}
              className="abi-field-input"
              style={{ width: '200px' }}
            />
            <AButton type="primary" className="btn-accent-gradient" onClick={handleSearch}>
              <SearchOutlined /> 查询
            </AButton>
            <AButton className="btn-ghost-v5" onClick={handleReset}>
              <ReloadOutlined /> 重置
            </AButton>
          </div>
        </section>

        {/* Table */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div
            style={{
              border: '1px solid rgba(130,140,200,0.18)',
              borderRadius: '12px',
              overflow: 'hidden',
              flex: 1,
              minHeight: 0,
            }}
          >
            <div className="assistant-table-scroll" style={{ overflow: 'auto', maxHeight: '100%' }}>
              <ATable
                columns={columns}
                dataSource={data}
                loading={loading}
                pagination={false}
                rowKey="userId"
                rowSelection={rowSelection}
                scroll={{ y: 400 }}
                size="middle"
                className="abi-std-table"
              />
            </div>
          </div>

          {/* Pagination */}
          <div className="data-source-pagination">
            <span className="total-text">共 {total} 条</span>
            <div className="pagination-controls">
              <ASelect
                value={pageSizeVal}
                onChange={handlePageSizeChange}
                options={[
                  { label: '10条/页', value: 10 },
                  { label: '15条/页', value: 15 },
                  { label: '20条/页', value: 20 },
                  { label: '25条/页', value: 25 },
                  { label: '30条/页', value: 30 },
                ]}
                className="page-size-select"
              />
              <button className="page-btn" disabled={pageNum === 1} onClick={handlePrev}>
                <LeftOutlined />
              </button>
              {renderPageNumbers()}
              <button className="page-btn" disabled={pageNum === totalPages} onClick={handleNext}>
                <RightOutlined />
              </button>
              <span className="quick-jumper">
                前往
                <AInput className="jump-input" style={{ width: 48, textAlign: 'center' }} value={jumpValue} onChange={(e) => setJumpValue(e.target.value)} onPressEnter={handleJump} />页
              </span>
            </div>
          </div>
        </div>
      </div>
    </CommonDrawer>
  )
}

export default MultiSelectTableDrawer
