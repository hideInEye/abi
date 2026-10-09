import appLogo from '@/assets/imgs/home/abi_logo.png'
import userIcon from '@/assets/imgs/home/用户.svg'
import { itemMap, primaryMenuData, primaryMenuMap } from '@/constants/layout/global_side'
import { selectSelectedMenuKey, setSelectedMenuKey } from '@/store/slice/layout'
import { localStg } from '@/utils/storage'
import { UserOutlined, SettingOutlined, TeamOutlined, LogoutOutlined, ClockCircleOutlined, BookOutlined } from '@ant-design/icons'
import SvgIcon from '@/components/stateless/custom/SvgIcon'
import { getOutlinedIcon } from '@/utils/antdIconRegistry'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

import { getAllRoutes } from '@/store/slice/route'
import { logoutNow } from '@/service/logout'
import { openChatConversationWindow } from '@/utils/chatWindow'
import { readPersistedSpaceId } from '@/utils/spaceStorage'
import { Dropdown, Layout } from 'antd'
import './index.scss'
import { useRoute, useRouter } from '~/packages/simple-router/src'
import { changeSpaceId, getSpaceId } from '@/store/slice/app'
const { Sider } = Layout

const GlobalSider: FC = memo(() => {
  const selectedMenuKey = useAppSelector(selectSelectedMenuKey)
  const userInfo = localStg.get('userInfo')
  const router = useRouter()
  const route = useRoute()
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const routes = useAppSelector(getAllRoutes)
  const showManage = routes.find((r) => r.name === 'manage')
  const showLog = routes.find((r) => r.name === 'log')
  const isMicroApp = qiankunWindow.__POWERED_BY_QIANKUN__
  const redirectHome = () => {
    router.push('/home')
  }
  const spaceId = useAppSelector(getSpaceId)
  const effectiveSpaceId = spaceId || readPersistedSpaceId()

  useEffect(() => {
    const path = route.path || '';
    let matchedName = '';

    if (path.startsWith('/home')) {
      matchedName = 'home';
    } else if (path.startsWith('/ai-assistant')) {
      matchedName = 'ai-assistant_conversational-analysis';
    } else if (path.startsWith('/workbench/')) {
      matchedName = 'assistant-manage_assistant-config';
    } else if (path.startsWith('/component/')) {
      matchedName = 'system_model';
    }

    if (matchedName && primaryMenuMap.get(matchedName)) {
      dispatch(setSelectedMenuKey(matchedName));
    }
  }, [route])

  useEffect(() => {
    if (!spaceId && effectiveSpaceId) {
      dispatch(changeSpaceId(effectiveSpaceId))
    }
  }, [dispatch, effectiveSpaceId, spaceId])

  const userItems = useCallback(() => {
    const userName = isMicroApp ? window.qiankunStore.state.userInfo?.userName : userInfo?.userName

    // 从后端返回的路由中查找「空间管理」父节点，读取菜单管理里配置的图标
    const spaceRoute = routes.find((r: any) => r?.name === 'space')
    const spaceIconName = spaceRoute?.meta?.icon as string | undefined
    const spaceLocalIcon = spaceRoute?.meta?.localIcon as string | undefined
    const renderSpaceIcon = () => {
      if (spaceLocalIcon) {
        return <SvgIcon localIcon={spaceLocalIcon}  style={{ fontSize: 18 }} />
      }
      if (spaceIconName) {
        const AntdIcon = getOutlinedIcon(spaceIconName)
        if (AntdIcon) {
          return <AntdIcon  />
        }
        // 兼容 iconify 图标名（如 mdi:inbox-outline）
        return <SvgIcon icon={spaceIconName}  style={{ fontSize: 18 }} />
      }
      return <TeamOutlined  />
    }
    
    const items: any[] = [
      {
        key: 'user-header',
        label: (
          <div className="abi-user-dropdown-header-new">
            <UserOutlined  />
            <span className="abi-user-dropdown-label-new">{userName || '用户'}</span>
          </div>
        ),
        disabled: true,
        className: 'abi-user-dropdown-header-item',
      },
      { type: 'divider', className: 'abi-user-dropdown-divider-new' },
    ]
    
    if (showManage) {
      items.push({
        key: 'manage_user',
        label: (
          <div className="abi-user-dropdown-item-new">
            <SettingOutlined  />
            <span>系统管理</span>
          </div>
        ),
        className: 'abi-user-dropdown-menu-item',
      })
      items.push({
        key: 'space_space-user',
        label: (
          <div className="abi-user-dropdown-item-new">
            {renderSpaceIcon()}
            <span>空间管理</span>
          </div>
        ),
        className: 'abi-user-dropdown-menu-item',
      })
      items.push({
        key: 'systems_data-dictionary',
        label: (
          <div className="abi-user-dropdown-item-new">
            <BookOutlined  />
            <span>系统字典</span>
          </div>
        ),
        className: 'abi-user-dropdown-menu-item',
      })
    }
    
    if (showLog) {
      items.push({
        key: 'log',
        label: (
          <div className="abi-user-dropdown-item-new">
            <ClockCircleOutlined  />
            <span>日志管理</span>
          </div>
        ),
        className: 'abi-user-dropdown-menu-item',
      })
    }

    items.push({ type: 'divider', className: 'abi-user-dropdown-divider-new' })
    items.push({
      key: 'logout',
      label: (
        <div className="abi-user-dropdown-item-new">
          <LogoutOutlined  />
          <span>退出登录</span>
        </div>
      ),
      className: 'abi-user-dropdown-menu-item',
    })
    
    return items
  }, [showManage, showLog, routes])

  const handleMenuClick = (e: any) => {
    // 目标路由未注册时（如目录子菜单尚未配置）不跳转，避免回退到通配路由
    if (itemMap.get(e.key) && router.getRouteByName(e.key)) {
      router.push({ name: e.key })
      selectedMenuKey && dispatch(setSelectedMenuKey(''))
    }
    if (e.key === 'logout') {
      const logout = () => {
        window?.$modal?.confirm({
          cancelText: t('common.cancel'),
          content: t('common.logoutConfirm'),
          okText: t('common.confirm'),
          onOk: () => logoutNow(),
          title: t('common.tip'),
        })
      }
      logout()
    }
  }

  return (
    <Sider
      width="72px"
      className="abi-nav-sider"
    >
      <div className="abi-nav-container">
        <div className="abi-nav-brand" onClick={redirectHome}>
          <img src={appLogo} alt="ABI Logo" className="abi-nav-brand-img" />
        </div>
        
        {/* Nav Items - Top */}
        <div className="abi-nav-items">
          {primaryMenuData.map((item) => {
            const isActive = item.name === selectedMenuKey
            return (
              <button
                key={item.key}
                className={`abi-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  if (item.key === 'chat-ui') {
                    openChatConversationWindow({ spaceId: effectiveSpaceId || undefined })
                    return
                  }
                  dispatch(setSelectedMenuKey(item.name))
                  router.push(item.url)
                }}
              >
                <SvgIcon localIcon={item.icon} style={{ fontSize: 20 }} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>

        {/* Spacer */}
        <div className="abi-nav-spacer" />

        {/* Divider */}
        <div className="abi-nav-divider" />

        {/* User Section - Bottom */}
        <div className="abi-nav-user">
          <Dropdown
            trigger={['click']}
            placement="topRight"
            overlayClassName="abi-user-dropdown-overlay"
            dropdownRender={(menu) => (
              <div className="abi-user-dropdown-panel">
                {menu}
              </div>
            )}
            menu={{ items: userItems(), onClick: handleMenuClick }}
          >
            <div className="abi-nav-user-btn">
              <div className="abi-nav-user-icon">
                <img src={userIcon} alt="user" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              </div>
              <span>用户</span>
            </div>
          </Dropdown>
        </div>
      </div>
    </Sider>
  )
})

export default GlobalSider
