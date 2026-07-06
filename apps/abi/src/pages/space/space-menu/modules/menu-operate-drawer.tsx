import { Form, TreeSelect } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import { useState } from 'react'

import { enableStatusOptions, menuCacheOptions, menuTypeOptions, menuVisibleOptions } from '@/constants/business'
import { getSpaceMenuTreeListApi } from '@/service/api/space-menu'
// import { getLocalIcons } from '@/utils/icon';

import IconSelector from '../../component/icon-selector'
import './menu-operate-drawer.scss'

type Props = Page.OperateDrawerProps

// const localIcons = getLocalIcons();

// const localIconOptions = localIcons.map(item => ({
//   label: (
//     <div className="flex-y-center gap-16px">
//       <SvgIcon
//         className="text-icon"
//         localIcon={item}
//       />
//       <span>{item}</span>
//     </div>
//   ),
//   value: item
// }));

const DatasourceOperateDrawer: FC<Props> = memo(({ form, handleSubmit, onClose, open, operateType }) => {
  const { t } = useTranslation()
  const [menuTree, setMenuTree] = useState([])
  const getMenuTree = async () => {
    const res = await getSpaceMenuTreeListApi()
    setMenuTree([
      {
        children: res.data,
        id: 0,
        label: '主类目',
      },
    ])
  }

  const menuType = Form.useWatch('menuType', form) // 监听 menuType

  useEffect(() => {
    getMenuTree()
  }, [open])

  /* eslint-disable-next-line */
  const onParentChange = (val: string, label: any) => {
    form.setFieldsValue({ parentName: label[0] })
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

  return (
    <CommonDrawer
      className="space-menu-drawer-v5"
      open={open}
      title={operateType === 'add' ? t('page.manage.menu.addMenu') : t('page.manage.menu.editMenu')}
      footer={
        <div className="menu-drawer-footer-v5">
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
      <div className="menu-form-panel">
        <AForm form={form} layout="vertical">
          {/* 验证 parentName 是否存入表单 */}
          <AForm.Item
            label="Parent Name"
            name="parentName"
            style={{ display: 'none' }} // 隐藏字段
          >
            <AInput disabled />
          </AForm.Item>

          <AForm.Item label={t('page.manage.menu.parent')} name="parentId">
            <TreeSelect
              placeholder={t('page.manage.menu.form.parent')}
              treeData={menuTree}
              fieldNames={{
                // 实际值对应数据中的 id 字段
                children: 'children',
                label: 'label', // 显示文本对应数据中的 label 字段
                value: 'id', // 子节点字段（可选，默认 children）
              }}
              onChange={onParentChange}
            />
          </AForm.Item>

          <AForm.Item label={t('page.manage.menu.menuType')} name="menuType" rules={[{ required: true }]}>
            <ARadio.Group disabled={operateType === 'edit'}>
              {menuTypeOptions.map((item) => (
                <ARadio key={item.value} value={item.value}>
                  {t(item.label)}
                </ARadio>
              ))}
            </ARadio.Group>
          </AForm.Item>

          {/* 图标 */}
          <AForm.Item label={t('page.manage.menu.icon')} name="icon">
            {/* <ASelect
            allowClear
            options={localIconOptions}
            placeholder={t('page.manage.menu.form.localIcon')}
          /> */}
            <IconSelector showTooltip tooltipText={t('page.manage.menu.form.localIcon')} />
          </AForm.Item>

          {/* 排序 */}
          <AForm.Item label={t('page.manage.menu.order')} name="orderNum">
            <AInputNumber className="w-full" min={0} placeholder={t('page.manage.menu.form.order')} precision={0} />
          </AForm.Item>

          {/* 菜单名称 */}
          <AForm.Item label={t('page.manage.menu.menuName')} name="menuName" rules={[{ required: true }]}>
            <AInput placeholder={t('page.manage.menu.form.menuName')} />
          </AForm.Item>

          {/* 路由名称 */}
          <AForm.Item label={t('page.manage.menu.routeName')} name="routeName" style={{ display: menuType !== '2' ? 'none' : 'block' }}>
            <AInput placeholder={t('page.manage.menu.form.routeName')} />
          </AForm.Item>

          {/* 是否外链 */}
          <AForm.Item label={t('page.manage.menu.isFrame')} name="isFrame">
            <ARadio.Group>
              <ARadio value="0">{t('common.yesOrNo.yes')}</ARadio>
              <ARadio value="1">{t('common.yesOrNo.no')}</ARadio>
            </ARadio.Group>
          </AForm.Item>

          {/* 路由地址 */}
          <AForm.Item label={t('page.manage.menu.routePath')} name="path">
            <AInput placeholder={t('page.manage.menu.form.routePath')} />
          </AForm.Item>

          {/* 组件路径 */}
          <AForm.Item label={t('page.manage.menu.componentPath')} name="component" style={{ display: menuType !== '2' ? 'none' : 'block' }}>
            <AInput placeholder={t('page.manage.menu.form.routePath')} />
          </AForm.Item>

          {/* 权限字符 */}
          <AForm.Item label={t('page.manage.menu.perms')} name="perms" style={{ display: menuType !== '2' ? 'none' : 'block' }}>
            <AInput placeholder={t('page.manage.menu.form.perms')} />
          </AForm.Item>

          {/* 路由参数 */}
          <AForm.Item label={t('page.manage.menu.query')} name="query" style={{ display: menuType !== '2' ? 'none' : 'block' }}>
            <AInput placeholder={t('page.manage.menu.form.queryKey')} />
          </AForm.Item>

          {/* 是否缓存 */}
          <AForm.Item label={t('page.manage.menu.isCache')} name="isCache" style={{ display: menuType !== '2' ? 'none' : 'block' }}>
            <ARadio.Group>
              {menuCacheOptions.map((item) => (
                <ARadio key={item.value} value={item.value}>
                  {t(item.label)}
                </ARadio>
              ))}
            </ARadio.Group>
          </AForm.Item>

          {/* 显示状态 */}
          <AForm.Item label={t('page.manage.menu.visible')} name="visible">
            <ARadio.Group>
              {menuVisibleOptions.map((item) => (
                <ARadio key={item.value} value={item.value}>
                  {t(item.label)}
                </ARadio>
              ))}
            </ARadio.Group>
          </AForm.Item>

          {/* 菜单状态 */}
          <AForm.Item label={t('page.manage.menu.status')} name="status">
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

export default DatasourceOperateDrawer
