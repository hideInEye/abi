import { CaretDownOutlined } from '@ant-design/icons'
import { Dropdown, Space } from 'antd'
import type { MenuProps } from 'antd/lib'
import type { FC } from 'react'
import { useCallback } from 'react'

import type { ISpaceItem } from '@/pages/space-list/types'
import s from '../../home/index.module.scss'

interface SpaceItemCardProps {
  readonly deleteSpace: (space: ISpaceItem) => void
  readonly setEditSpace: (space: ISpaceItem) => void
  readonly space: ISpaceItem
}

export const SpaceItemCard: FC<SpaceItemCardProps> = ({ deleteSpace, setEditSpace, space }) => {
  const handleEdit = useCallback(() => {
    setEditSpace(space)
  }, [setEditSpace, space])

  const handleDelete = useCallback(() => {
    AModal.confirm({
      content: '确定删除该空间吗？',
      onOk: () => {
        deleteSpace(space)
      },
      title: '删除空间',
    })
  }, [deleteSpace, space])

  // current user and simplified permission check: only admin or space creator can delete
  const currentUserObj: any = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
  const isAdmin = currentUserObj?.userName === 'admin'
  const createByMatchesUserName = space.createBy === currentUserObj?.userName
  const createByMatchesUserId = space.createBy === (currentUserObj?.userId || '').toString()
  const isCreator = Boolean(space.createBy && (createByMatchesUserName || createByMatchesUserId))
  const canDelete = isAdmin || Boolean(isCreator)

  const items = [
    {
      key: 'edit',
      label: '编辑',
    },
    {
      key: 'delete',
      label: '删除',
    },
  ]
  if (!canDelete) {
    items.splice(1, 1)
  }
  const onClick: MenuProps['onClick'] = ({ key, domEvent }) => {
    domEvent.stopPropagation()
    domEvent.preventDefault()
    if (key === 'edit') {
      handleEdit()
    } else if (key === 'delete') {
      handleDelete()
    }
  }

  return (
    <div
      className={`flex flex-col cursor-pointer rounded-[10px] py-[14px] px-[20px] ${s['space-item']}`}
      style={{ boxShadow: '0px 8px 16px 0px rgba(0,0,0,0.1)' }}
      key={space.spaceId}
    >
      <AFlex align="center" justify="space-between" gap="16px">
        <APopover content={space.spaceName}>
          <div className="text-[18px] text-[#374557] text-nowrap flex-1 overflow-hidden text-ellipsis lh-[1.75rem] font-semibold">{space.spaceName}</div>
        </APopover>
        <Dropdown menu={{ items, onClick }}>
          <a
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
            }}
            style={{ color: '#848FA2' }}
          >
            <Space>
              操作
              <CaretDownOutlined style={{ color: '#3366FF' }} />
            </Space>
          </a>
        </Dropdown>
      </AFlex>
      <div className="bg-[#DCDCDC] h-[1px] w-full mt-[10px] mb-[23px]"></div>
      <div className="flex flex-col gap-[16px] text-[14px] op80">
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          <span className="text-[#666666]">创建人</span>
          <span className="text-left text-[#333333]">{space.createBy}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          <span className="text-[#666666]">空间 id</span>
          <span className="break-all text-left text-[#333333]">{space.spaceId}</span>
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-2">
          <span className="text-[#666666]">创建时间</span>
          <span className="text-left text-[#333333]">{space.createTime}</span>
        </div>
      </div>
    </div>
  )
}
