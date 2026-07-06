import { CheckCircleFilled, CloseOutlined, SafetyCertificateOutlined, SafetyOutlined } from '@ant-design/icons'
import { message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import type { FC } from 'react'
import { useEffect, useState } from 'react'

import { querySpaceRoleList } from '@/service/api/space'

import type { PermissionItem } from '../types'

interface PermissionManagementProps {
  defaultPermissionKeys: any[]
  open: boolean
  permissionCancel: () => void
  permissionSure: (permission: any[]) => void
  setOpen: (open: boolean) => void
}

function normalizePermissionKeys(keys: any[]) {
  if (!Array.isArray(keys)) return []
  return keys.filter((key) => key !== undefined && key !== null && key !== '').slice(0, 1)
}

export const PermissionManagement: FC<PermissionManagementProps> = ({ defaultPermissionKeys, open, permissionCancel, permissionSure, setOpen }) => {
  const [permissionList, setPermissionList] = useState<PermissionItem[]>([])
  const [alreadySelectedPermission, setAlreadySelectedPermission] = useState<any[]>(normalizePermissionKeys(defaultPermissionKeys))

  function handlePermissionChange(roleId: any) {
    setAlreadySelectedPermission(normalizePermissionKeys([roleId]))
  }

  async function getSpaceRoleList() {
    const { data } = await querySpaceRoleList()
    setPermissionList(data)
  }

  useEffect(() => {
    getSpaceRoleList()
  }, [])

  const sure = () => {
    if (alreadySelectedPermission.length === 0) {
      message.warning('未选择空间角色权限')
      return
    }

    const spaceRole = alreadySelectedPermission.map((key) => {
      const role = permissionList.find((item: any) => item.roleId === key)
      if (role) {
        return {
          roleId: role.roleId,
          roleName: role.roleName,
        }
      }
      return null
    })

    permissionSure(spaceRole)
    setAlreadySelectedPermission([])
    setOpen(false)
  }

  const cancel = () => {
    permissionCancel()
    setOpen(false)
    setAlreadySelectedPermission([])
  }

  const selectedCount = alreadySelectedPermission.length

  return (
    <CommonDrawer
      className="sd-v5-perm-drawer"
      footer={<PermDrawerFooter sure={sure} cancel={cancel} selectedCount={selectedCount} />}
      open={open}
      icon={<SafetyOutlined />}
      title="权限管理"
      width={680}
      onClose={() => setOpen(false)}
    >
      {/* Selection summary bar */}
      <div className="sd-v5-perm-summary">
        <div className="sd-v5-perm-summary-left">
          <SafetyCertificateOutlined style={{ color: '#5b7cf7', fontSize: 16 }} />
          <span className="sd-v5-perm-summary-text">
            已选择 <strong>{selectedCount}</strong> 个角色
          </span>
        </div>
        {selectedCount > 0 && (
          <AButton type="link" size="small" onClick={() => setAlreadySelectedPermission([])} className="sd-v5-perm-clear">
            清空选择
          </AButton>
        )}
      </div>

      {/* Role list */}
      <div className="sd-v5-perm-section">
        <div className="sd-v5-perm-section-title">选择空间角色</div>
        <ARadio.Group className="sd-v5-perm-list" style={{ width: '100%' }} value={alreadySelectedPermission[0]} onChange={(event) => handlePermissionChange(event.target.value)}>
          {permissionList.map((item) => {
            const isActive = alreadySelectedPermission.includes(item.roleId)
            return (
              <div key={item.roleId} className={`sd-v5-perm-card ${isActive ? 'sd-v5-perm-card-active' : ''}`}>
                <ARadio value={item.roleId}>
                  <div className="sd-v5-perm-card-inner">
                    <div className="sd-v5-perm-card-icon">
                      <SafetyOutlined />
                    </div>
                    <div className="sd-v5-perm-card-body">
                      <div className="sd-v5-perm-card-name">{item.roleName}</div>
                      <div className="sd-v5-perm-card-desc">{item.remark || '暂无描述'}</div>
                    </div>
                    {isActive && (
                      <div className="sd-v5-perm-card-check">
                        <CheckCircleFilled />
                      </div>
                    )}
                  </div>
                </ARadio>
              </div>
            )
          })}
        </ARadio.Group>
      </div>
    </CommonDrawer>
  )
}

function PermDrawerFooter({ sure, cancel, selectedCount }: { sure: () => void; cancel: () => void; selectedCount: number }) {
  return (
    <div className="sd-v5-footer">
      <span className="sd-v5-perm-footer-hint">{selectedCount > 0 ? `已选 ${selectedCount} 个角色` : '请至少选择一个角色'}</span>
      <div style={{ flex: 1 }} />
      <AButton className="btn-ghost-v5" onClick={cancel}>
        取消
      </AButton>
      <AButton className="btn-accent-gradient" onClick={sure}>
        完成
      </AButton>
    </div>
  )
}
