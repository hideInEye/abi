import { TreeSelect } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React, { useState } from 'react'

import { enableStatusOptions } from '@/constants/business'
import { getDeptListApi } from '@/service/api/dept'

import './dept-operate-drawer.scss'

type Props = Page.OperateDrawerProps

const DeptOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()
  const [deptTree, setDeptTree] = useState([])

  interface TreeNode<T> {
    children?: TreeNode<T>[]
    data?: T
    parentId?: string | number
    [idKey: string]: string | number | T | undefined
  }

  function listToTree<T, K extends keyof TreeNode<T>>(
    list: TreeNode<T>[],
    options: {
      childrenKey?: string
      idKey?: K
      parentKey?: K
    } = {},
  ): TreeNode<T>[] {
    const { childrenKey = 'children', idKey = 'id' as K, parentKey = 'parentId' as K } = options

    // 1. 预处理：收集所有存在的节点ID
    const existingIds = new Set(list.map((node) => node[idKey]))

    // 2. 创建节点映射表
    const nodeMap = new Map<TreeNode<T>[keyof TreeNode<T>], TreeNode<T>>()

    list.forEach((node) => {
      const id = node[idKey]
      const treeNode = {
        ...node,
        [childrenKey]: [],
      } as TreeNode<T> & { [childrenKey]: TreeNode<T>[] }

      nodeMap.set(id, treeNode)
    })

    // 3. 构建树结构
    const tree: TreeNode<T>[] = []
    list.forEach((node) => {
      const id = node[idKey]
      const parentId = node[parentKey]
      const currentNode = nodeMap.get(id)!

      // 优化后的根节点判断逻辑：
      // 1. parentId 不存在
      // 2. parentId 存在但不在当前节点列表中
      const isRoot = parentId === 0 || parentId === null || !(parentKey in node) || !existingIds.has(parentId)

      if (isRoot) {
        tree.push(currentNode)
      } else {
        const parentNode = nodeMap.get(parentId as TreeNode<T>[keyof TreeNode<T>])
        if (parentNode) {
          parentNode[childrenKey]!.push(currentNode)
        }
      }
    })

    return tree
  }

  const getMenuTree = async () => {
    const res = await getDeptListApi({})
    const treeData = listToTree(res.data, {
      childrenKey: 'children',
      idKey: 'deptId',
      parentKey: 'parentId' as const,
    })
    setDeptTree(treeData)
  }

  const submit = async () => {
    try {
      const values = await form.validateFields()
      handleSubmit({ ...values })
    } catch (err) {
      // eslint-disable-next-line
      console.log(err)
    }
  }

  useEffect(() => {
    if (open) {
      getMenuTree()
    }
  }, [open])

  return (
    <CommonDrawer
      className="dept-drawer-v5"
      open={open}
      title={operateType === 'add' ? t('page.manage.dept.addDept') : t('page.manage.dept.editDept')}
      footer={
        <div className="dept-drawer-footer-v5">
          <AButton className="btn-ghost-v5" onClick={onClose}>
            {t('common.cancel')}
          </AButton>
          <AButton className="btn-accent-gradient" onClick={submit}>
            {t('common.confirm')}
          </AButton>
        </div>
      }
      onClose={onClose}
    >
      <div className="dept-form-panel">
        <AForm form={form} layout="vertical">
          {/* 验证 parentName 是否存入表单 */}
          <AForm.Item
            label="Parent Name"
            name="parentName"
            style={{ display: 'none' }} // 隐藏字段
          >
            <AInput disabled />
          </AForm.Item>

          <AForm.Item label={t('page.manage.dept.parentId')} name="parentId" rules={[{ required: true }]}>
            <TreeSelect
              placeholder={t('page.manage.menu.form.parentId')}
              treeData={deptTree}
              fieldNames={{
                children: 'children',
                label: 'deptName', // 显示文本对应数据中的 label 字段
                value: 'deptId', // 子节点字段（可选，默认 children）
              }}
            />
          </AForm.Item>

          {/* 部门名称 */}
          <AForm.Item label={t('page.manage.dept.deptName')} name="deptName" rules={[{ required: true }]}>
            <AInput placeholder={t('page.manage.dept.form.deptName')} />
          </AForm.Item>

          {/* 排序 */}
          <AForm.Item label={t('page.manage.dept.orderNum')} name="orderNum" rules={[{ required: true }]}>
            <AInputNumber className="w-full" min={0} placeholder={t('page.manage.dept.form.orderNum')} precision={0} />
          </AForm.Item>

          {/* 负责人 */}
          <AForm.Item label={t('page.manage.dept.leader')} name="leader">
            <AInput placeholder={t('page.manage.dept.form.leader')} />
          </AForm.Item>

          {/* 联系电话 */}
          <AForm.Item
            label={t('page.manage.dept.phone')}
            name="phone"
            rules={[
              {
                message: t('page.manage.dept.form.checkPhone'),
                pattern: /^1[3-9]\d{9}$/,
              },
            ]}
          >
            <AInput placeholder={t('page.manage.dept.form.phone')} />
          </AForm.Item>

          {/* 邮箱 */}
          <AForm.Item label={t('page.manage.dept.email')} name="email" rules={[{ message: t('page.manage.dept.form.checkEmail'), type: 'email' }]}>
            <AInput placeholder={t('page.manage.dept.form.email')} />
          </AForm.Item>

          {/* 状态 */}
          <AForm.Item label={t('page.manage.dept.status')} name="status">
            <ARadio.Group>
              {enableStatusOptions.map((item) => (
                <ARadio key={item.value} value={item.value}>
                  {t(item.label)}
                </ARadio>
              ))}
            </ARadio.Group>
          </AForm.Item>
        </AForm>
      </div>
    </CommonDrawer>
  )
})

export default DeptOperateDrawer
