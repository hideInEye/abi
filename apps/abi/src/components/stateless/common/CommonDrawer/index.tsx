import { AppstoreOutlined, CloseOutlined } from '@ant-design/icons'
import { Drawer } from 'antd'
import type { DrawerProps } from 'antd'
import type { MouseEventHandler, ReactNode } from 'react'

import './index.scss'

type CommonDrawerProps = Omit<DrawerProps, 'title'> & {
  description?: ReactNode
  icon?: ReactNode
  title?: ReactNode
}

type CommonDrawerTitleProps = {
  description?: ReactNode
  icon?: ReactNode
  title: ReactNode
}

function CommonDrawerTitle({ description, icon, title }: CommonDrawerTitleProps) {
  return (
    <div className="abi-common-drawer-title">
      <span className="abi-common-drawer-title-icon">{icon || <AppstoreOutlined />}</span>
      <span className="abi-common-drawer-title-content">
        <span className="abi-common-drawer-title-text">{title}</span>
        {description ? <span className="abi-common-drawer-title-desc">{description}</span> : null}
      </span>
    </div>
  )
}

function CommonDrawer({ className, closable = true, description, extra, icon, onClose, title, ...props }: CommonDrawerProps) {
  const drawerTitle = title === null || title === undefined ? title : <CommonDrawerTitle description={description} icon={icon} title={title} />
  const handleCloseClick: MouseEventHandler<HTMLSpanElement> = (event) => {
    onClose?.(event)
  }
  const drawerExtra =
    closable === false && !extra ? undefined : (
      <div className="abi-common-drawer-extra">
        {extra}
        {closable === false ? null : <CloseOutlined className="abi-common-drawer-close" onClick={handleCloseClick} />}
      </div>
    )

  return <Drawer {...props} className={['abi-common-drawer', className].filter(Boolean).join(' ')} closeIcon={null} closable={false} extra={drawerExtra} title={drawerTitle} onClose={onClose} />
}

export type { CommonDrawerProps }
export default CommonDrawer
