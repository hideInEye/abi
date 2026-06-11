import { CaretDownOutlined } from '@ant-design/icons'
import type { FC } from 'react'
import { useCallback } from 'react'

import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch'

import type { ISpaceItem } from '../types'
import s from '../../home/index.module.scss'
import { Dropdown, Space } from 'antd'
import { MenuProps } from 'antd/lib'
import { setSelectedMenuKey } from '@/store/slice/layout'
import { useRouter } from '~/packages/simple-router/src'
interface SpaceItemProps {
  readonly deleteSpace: (space: ISpaceItem) => void
  readonly setEditSpace: (space: ISpaceItem) => void
  readonly space: ISpaceItem
  readonly index?: number
}

const dotColors = ['blue', 'purple', 'green'] as const

export const SpaceItem: FC<SpaceItemProps> = ({ deleteSpace, setEditSpace, space, index }) => {
  const dispatch = useAppDispatch()
  const { push } = useRouter()

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

  const { switchToSpace } = useSpaceSwitch()

  const currentUserObj: any = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')
  const isAdmin = currentUserObj?.userName === 'admin'
  const createByMatchesUserName = space.createBy === currentUserObj?.userName
  const createByMatchesUserId = space.createBy === (currentUserObj?.userId || '').toString()
  const isCreator = Boolean(space.createBy && (createByMatchesUserName || createByMatchesUserId))
  const canDelete = isAdmin || Boolean(isCreator)

  const setSpaceId = (spaceId: number) => {
    switchToSpace(spaceId, undefined, { redirect: true })
    dispatch(setSelectedMenuKey('assistant-manage_assistant-config'))
    push('/workbench')
  }

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

  const dotColor = dotColors[(index ?? 0) % dotColors.length]

  return (
    <div
      className={s['space-card']}
      key={space.spaceId}
      onClick={() => {
        setSpaceId(space.spaceId)
      }}
    >
      <div className={s['space-card-head']}>
        <div className={s['space-card-name']}>
          <div className={`${s['space-card-dot']} ${s[dotColor]}`}></div>
          <APopover content={space.spaceName}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '10rem' }}>{space.spaceName}</span>
          </APopover>
        </div>
        <div className={s['space-card-actions']}>
          <Dropdown menu={{ items, onClick }}>
            <button
              onClick={(e) => {
                e.stopPropagation()
                e.preventDefault()
              }}
            >
              操作 <CaretDownOutlined style={{ fontSize: '0.625rem' }} />
            </button>
          </Dropdown>
        </div>
      </div>
      <div className={s['space-card-meta']}>
        <div className={s['space-card-meta-row']}>
          <span className={s['space-card-meta-lbl']}>创建人：</span>
          <span className={s['space-card-meta-val']}>{space.createBy}</span>
        </div>
        <div className={s['space-card-meta-row']}>
          <span className={s['space-card-meta-lbl']}>创建时间：</span>
          <span className={s['space-card-meta-val']}>{space.createTime}</span>
        </div>
        <div className={s['space-card-meta-row']}>
          <span className={s['space-card-meta-lbl']}>空间 ID：</span>
          <span className={s['space-card-meta-val-id']}>{space.spaceId}</span>
        </div>
      </div>
    </div>
  )
}
