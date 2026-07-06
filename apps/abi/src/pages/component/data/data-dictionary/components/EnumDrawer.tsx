import { CloseOutlined, OrderedListOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons'
import { Button, Flex, Input } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useEffect, useState } from 'react'

import { addDictionaryEnum, deleteDictionaryEnum, queryDictionaryEnum, updateDictionaryEnum } from '@/service/api/dictionary'

import { useDataPreparationStore } from '../store'
import type { DictionaryEnumItem } from '../types'

import { AddOrEditEnum } from './EnumAddOrEdit'
import { TableEnum } from './EnumTable'

interface EnumDrawerProps {
  readonly close: () => void
  readonly enumerationModalOpen: boolean
}

export const EnumDrawer: React.FC<EnumDrawerProps> = ({ close, enumerationModalOpen }) => {
  const { enumInfo } = useDataPreparationStore()
  const [enumEditObj, setEnumEditObj] = useState<any>(null)
  const [enumModalOpen, setEnumModalOpen] = useState(false)
  const [enumerationDataSource, setEnumerationDataSource] = useState<{
    code: number
    msg: string
    rows: any[]
    total: number
  }>()
  const [dictNumber, setDictNumber] = useState(1)
  const [searchValue, setSearchValue] = useState('')

  const enumClose = () => {
    setEnumModalOpen(false)
    setEnumEditObj(null)
  }

  const getEnumInfo = async (params: any) => {
    const res = await queryDictionaryEnum(params)
    setEnumerationDataSource(res.response.data as any)
  }

  useEffect(() => {
    if (enumInfo?.dictField) {
      getEnumInfo({
        dictField: enumInfo!.dictField,
        dictLabel: '',
        pageNum: dictNumber,
        pageSize: 10,
      })
    }
  }, [enumInfo?.dictId, dictNumber])

  const dictSearch = (value: string) => {
    setSearchValue(value)
    setDictNumber(1)
    setEnumerationDataSource({
      code: 0,
      msg: '',
      rows: [],
      total: 0,
    })

    getEnumInfo({
      dictField: enumInfo!.dictField,
      dictLabel: value,
      pageNum: 1,
      pageSize: 10,
    })
  }

  const handleReset = () => {
    setSearchValue('')
    dictSearch('')
  }

  const refreshEnumInfo = () => {
    setEnumModalOpen(false)
    setEnumEditObj(null)
    getEnumInfo({
      dictField: enumInfo!.dictField,
      dictLabel: '',
      pageNum: dictNumber,
      pageSize: 10,
    })
  }

  const enumSure = async (values: DictionaryEnumItem) => {
    const apiCall = values.type === 'add' ? addDictionaryEnum : updateDictionaryEnum
    try {
      const res = await apiCall({
        ...values,
        dictId: enumInfo!.dictId,
      })

      if (res.response.data.code === 200) {
        refreshEnumInfo()
      }
    } catch (error) {
      console.error('Failed to save dictionary enum:', error)
    } finally {
      setEnumModalOpen(false)
      setEnumEditObj(null)
    }
  }

  const handleEnumDelete = async (dict: DictionaryEnumItem) => {
    const res = await deleteDictionaryEnum(dict.dictCode)
    if (res.response.data.code === 200) {
      setDictNumber(1)
      getEnumInfo({
        dictField: enumInfo!.dictField,
        dictLabel: '',
        pageNum: 1,
        pageSize: 10,
      })
    }
  }

  const handleEnumEdit = (record: DictionaryEnumItem) => {
    setEnumEditObj(record)
    setEnumModalOpen(true)
  }

  const dictField = enumInfo?.dictField || ''
  const dictName = enumInfo?.dictName || ''
  const totalCount = enumerationDataSource?.total || 0

  return (
    <>
      <CommonDrawer
        className="ds-operate-drawer"
        destroyOnClose
        open={enumerationModalOpen}
        description={
          <>
            {dictField} {dictName ? `· ${dictName}` : ''} · 共 {totalCount} 个枚举值
          </>
        }
        icon={<OrderedListOutlined />}
        title={'字典枚举管理'}
        width={1000}
        styles={{ body: { display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: 0 } }}
        footer={
          <div style={{ alignItems: 'center', display: 'flex', gap: 12, justifyContent: 'flex-end', padding: '4px 0' }}>
            <Button
              onClick={close}
              style={{ background: 'transparent', border: '1px solid rgba(130,140,200,0.18)', borderRadius: 8, color: '#5f7490', fontWeight: 500, height: 38, padding: '0 20px' }}
            >
              取消
            </Button>
            <Button
              onClick={close}
              style={{
                background: 'linear-gradient(135deg, #5b7cf7, #7091fa)',
                border: 'none',
                borderRadius: 8,
                boxShadow: '0 2px 10px rgba(91,124,247,0.3)',
                fontWeight: 600,
                height: 38,
                padding: '0 28px',
              }}
              type="primary"
            >
              完成
            </Button>
          </div>
        }
        onClose={close}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Searchbar */}
          <section style={{ flexShrink: 0, padding: '16px 24px', borderBottom: '1px solid rgba(130,140,200,0.10)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Input
                allowClear
                placeholder="请输入枚举名称"
                prefix={<SearchOutlined style={{ color: '#a3b3c8' }} />}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onPressEnter={() => dictSearch(searchValue)}
                className="abi-field-input"
                style={{ width: '220px' }}
              />
              <Button type="primary" className="btn-accent-gradient" onClick={() => dictSearch(searchValue)}>
                <SearchOutlined /> 查询
              </Button>
              <Button className="btn-ghost-v5" onClick={handleReset}>
                重置
              </Button>
              <div style={{ flex: 1 }} />
              <Button
                type="primary"
                className="btn-accent-gradient"
                onClick={() => {
                  setEnumEditObj(null)
                  setEnumModalOpen(true)
                }}
              >
                <PlusOutlined /> 新增枚举
              </Button>
            </div>
          </section>

          {/* Table area */}
          <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 24px' }}>
            <TableEnum dataSource={enumerationDataSource} dictNumber={dictNumber} onDelete={handleEnumDelete} onEdit={handleEnumEdit} onPageChange={setDictNumber} />
          </div>
        </div>
      </CommonDrawer>
      <AddOrEditEnum editObj={enumEditObj} open={enumModalOpen} onClose={enumClose} onSure={enumSure} />
    </>
  )
}
