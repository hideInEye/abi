import appLogo from '@/assets/imgs/home/abi_logo.png'
import userIcon from '@/assets/imgs/home/用户.svg'
import { itemMap, primaryMenuData, primaryMenuMap } from '@/constants/layout/global_side'
import { selectSelectedMenuKey, setSelectedMenuKey } from '@/store/slice/layout'
import { localStg } from '@/utils/storage'
import { UserOutlined } from '@ant-design/icons'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

import { getAllRoutes } from '@/store/slice/route'
import { logoutNow } from '@/utils/auth'
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
    const items = [
      {
        key: '1',
        label: isMicroApp ? window.qiankunStore.state.userInfo?.userName : userInfo?.userName,
        icon: <UserOutlined />,
      },
      {
        key: 'recently-used',
        label: '最近使用',
      },
      {
        key: 'my-collect',
        label: '我的收藏',
      },
      {
        key: 'share-manage_my-share',
        label: '我的分享',
      },
      {
        key: 'logout',
        label: '退出登录',
      },
    ]
    if (showManage) {
      items.splice(4, 0, {
        key: 'manage_user',
        label: '门户管理',
      })
      items.splice(5, 0, {
        key: 'space_user',
        label: '空间管理',
      })
    }
    return items
  }, [showManage])

  const handleMenuClick = (e: any) => {
    if (itemMap.get(e.key)) {
      router.push({ name: e.key })
      selectedMenuKey && dispatch(setSelectedMenuKey(''))
    }
    if (e.key === 'logout') {
      const logout = () => {
        window?.$modal?.confirm({
          cancelText: t('common.cancel'),
          content: t('common.logoutConfirm'),
          okText: t('common.confirm'),
          onOk: () => {
            // let needRedirect = false;
            // if (!route.meta?.constant) needRedirect = true;
            // submit({ needRedirect, redirectFullPath: route.fullPath }, { action: '/logout', method: 'post' });
            logoutNow()
          },
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
      <div className="flex h-full flex-col justify-between items-center py-[20px]">
        <div className=" flex items-center justify-center cursor-pointer" onClick={redirectHome}>
          <img src={appLogo} alt="ABI Logo" className="mb-6 h-12 w-12 rounded-full shadow-[0_0.625rem_1.5rem_rgba(51,102,255,0.28)]" />
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
                <SvgIcon localIcon={item.icon} style={{ fontSize: 21 }} />
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
          <Dropdown trigger={['click']} menu={{ items: userItems(), onClick: handleMenuClick }}>
            <div className="flex flex-col items-center cursor-pointer">
              <div className="abi-nav-user-icon">
                <img src={userIcon} alt="user" style={{ width: 26, height: 26, objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>用户</span>
            </div>
          </Dropdown>
        </div>
      </div>
    </Sider>
  )
})

export default GlobalSider
