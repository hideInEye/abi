import { ApartmentOutlined, DeleteOutlined, DownOutlined, MoreOutlined } from '@ant-design/icons'
import { Button, Dropdown, Popconfirm } from 'antd'
import type { MenuProps } from 'antd'
import { useState } from 'react'

interface Props {
  deleteDescription: string
  deleteTitle?: string
  deleting?: boolean
  extraItems?: MenuProps['items']
  onAnalysis: () => void
  onDelete: () => Promise<void>
  viewMode?: 'table' | 'card'
}

export function OntologyMetadataActions({ deleteDescription, deleteTitle = '提示', deleting, extraItems = [], onAnalysis, onDelete, viewMode = 'table' }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <Popconfirm
      cancelText="取消"
      description={deleteDescription}
      okText="确定"
      open={confirmOpen}
      title={deleteTitle}
      trigger={[]}
      onCancel={() => setConfirmOpen(false)}
      onConfirm={async () => {
        await onDelete()
        setConfirmOpen(false)
      }}
    >
      {/* 确认框锚定在常驻按钮上，避免菜单关闭时把删除确认一起卸载。 */}
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            { key: 'metadata', icon: <ApartmentOutlined />, label: '元数据分析', onClick: onAnalysis },
            ...extraItems,
            { type: 'divider' },
            { key: 'delete', icon: <DeleteOutlined />, label: '删除', danger: true, disabled: deleting, onClick: () => setConfirmOpen(true) },
          ],
        }}
      >
        {viewMode === 'card' ? (
          <button aria-label="更多操作" className="abi-card-more" disabled={deleting} type="button" onClick={event => event.stopPropagation()}>
            <MoreOutlined />
          </button>
        ) : (
          <Button className="abi-action-link" loading={deleting} size="small" type="link">
            更多 <DownOutlined style={{ fontSize: '0.625rem' }} />
          </Button>
        )}
      </Dropdown>
    </Popconfirm>
  )
}
