import { CheckCircleOutlined, CloseOutlined, EditOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons'
import type { FormInstance } from 'antd'
import { Form, message } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { useEffect, useState } from 'react'

import { createSpace, updateSpaceInfo } from '@/service/api/data-space'
import { spaceRoleList } from '@/service/api/role'

import { SpaceBasicInfo } from '../modules/SpaceInfoEdit'
import { UserManagement } from '../modules/UserManagement'
import { useSpaceListStore } from '../store'
import type { ISpaceItem } from '../types'

interface SpaceEditProps {
  readonly drawerOpen: boolean
  readonly editSpace: ISpaceItem | null
  readonly setDrawerOpen: (open: boolean) => void
  readonly updateSpace: () => void
}

export const SpaceEdit = ({ drawerOpen, editSpace, setDrawerOpen, updateSpace }: SpaceEditProps) => {
  const [tabActiveIndex, setTabActiveIndex] = useState(0)
  const { roleData, setAlreadySelectedKeys, setRoleData } = useSpaceListStore()
  const currentUserObj = JSON.parse(localStorage.getItem('SOY-REACT_userInfo') || '{}')

  const [form] = Form.useForm()

  function generateSpaceNewData() {
    const obj = {
      owners: '',
      remark: form.getFieldValue('remark'),
      spaceName: form.getFieldValue('spaceName'),
    }

    obj.owners = JSON.stringify(roleData)
    return obj
  }

  function resetForm() {
    form.resetFields()
    setRoleData([])
    setAlreadySelectedKeys([])
  }

  const toCreateSpace = async () => {
    const params: any = generateSpaceNewData()
    if (editSpace) {
      const editParams = {
        ...editSpace,
        ...params,
      }
      const { response } = await updateSpaceInfo(editParams)
      const { data } = response as any
      const { code, msg } = data
      if (code === 200) {
        message.success(msg)
        setDrawerOpen(false)
        updateSpace()
        resetForm()
      } else {
        message.error(msg)
      }
      return
    }
    const { response } = await createSpace(params)
    const { data } = response as any
    const { code, msg } = data
    if (code === 200) {
      message.success(msg)
      setDrawerOpen(false)
      updateSpace()
      resetForm()
    } else {
      message.error(msg)
    }
  }

  useEffect(() => {
    if (drawerOpen) {
      form.resetFields()
      if (editSpace) {
        form.setFieldsValue(editSpace)
      }
      setTabActiveIndex(0)
    }
  }, [editSpace, drawerOpen, form])

  useEffect(() => {
    if (editSpace) {
      form.setFieldsValue(editSpace)

      const oidList = JSON.parse(editSpace?.owners || '{}').map((i: any) => i.oid)
      setAlreadySelectedKeys(oidList)
      setRoleData(JSON.parse(editSpace?.owners || '{}'))
    } else {
      resetForm()
      setAlreadySelectedKeys([currentUserObj.userId])

      spaceRoleList({ pageNum: 1, pageSize: 100000 }).then((res) => {
        const { data } = res.data as any
        if (Array.isArray(data)) {
          const createRole = data.find((i: any) => i.roleKey === 'creator')
          if (createRole) {
            setRoleData([
              {
                oid: currentUserObj.userId,
                oname: currentUserObj.userName,
                orgId: currentUserObj.dept.deptId,
                orgName: currentUserObj.dept.deptName,
                recordId: currentUserObj.userUuid,
                otype: 1,
                roles: [
                  {
                    roleId: createRole.roleId,
                    roleName: createRole.roleName,
                  },
                ],
                type: 'special-user',
              },
            ])
          }
        }
      })
    }
  }, [editSpace])

  const tabsData = [
    {
      children: <SpaceBasicInfo editSpace={editSpace} />,
      icon: <EditOutlined />,
      key: '0',
      label: '基本信息',
    },
    {
      children: <UserManagement />,
      icon: <TeamOutlined />,
      key: '1',
      label: '用户管理',
    },
  ]

  return (
    <CommonDrawer
      className="sd-v5-space-drawer"
      open={drawerOpen}
      icon={editSpace ? <EditOutlined /> : <CheckCircleOutlined />}
      title={editSpace ? '编辑空间' : '新建空间'}
      width={900}
      footer={<SpaceDrawerFooter formInstance={form} setDrawerOpen={setDrawerOpen} setTabIndex={setTabActiveIndex} tabIndex={tabActiveIndex} toCreateSpace={toCreateSpace} />}
      onClose={() => setDrawerOpen(false)}
    >
      {/* v5 Tab navigation */}
      <div className="sd-v5-tabs">
        {tabsData.map((item, idx) => (
          <button key={item.key} className={`sd-v5-tab-btn ${tabActiveIndex === idx ? 'sd-v5-tab-active' : ''}`} onClick={() => setTabActiveIndex(idx)}>
            <span className="sd-v5-tab-icon">{item.icon}</span>
            <span className="sd-v5-tab-label">{item.label}</span>
            {tabActiveIndex === idx && <span className="sd-v5-tab-indicator" />}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="sd-v5-tab-content">
        <AForm form={form} layout="vertical">
          {tabsData[tabActiveIndex].children}
        </AForm>
      </div>
    </CommonDrawer>
  )
}

function SpaceDrawerFooter({
  formInstance,
  setDrawerOpen,
  setTabIndex,
  tabIndex,
  toCreateSpace,
}: {
  readonly formInstance: FormInstance<any>
  readonly setDrawerOpen: (open: boolean) => void
  readonly setTabIndex: (index: number) => void
  readonly tabIndex: number
  readonly toCreateSpace: () => void
}) {
  const previousStep = () => {
    if (tabIndex === 0) {
      setDrawerOpen(false)
    } else {
      setTabIndex(tabIndex - 1)
    }
  }

  const nextStep = async () => {
    const { error } = await formInstance.validateFields()
    if (error) {
      return
    }

    if (tabIndex === 1) {
      toCreateSpace()
      return
    }
    setTabIndex(tabIndex + 1)
  }

  return (
    <div className="sd-v5-footer">
      <AButton className="btn-ghost-v5" onClick={previousStep}>
        {tabIndex === 0 ? '取消' : '上一步'}
      </AButton>
      <AButton className="btn-accent-gradient" onClick={nextStep}>
        {tabIndex < 1 ? '下一步' : '完成'}
      </AButton>
    </div>
  )
}
