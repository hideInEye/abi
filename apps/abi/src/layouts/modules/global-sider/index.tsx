import appLogo from '@/assets/imgs/home/home_logo.png'
import userIcon from '@/assets/imgs/home/users.png'
import { itemMap, primaryMenuData, primaryMenuMap } from '@/constants/layout/global_side'
import SvgIcon from '@/components/stateless/custom/SvgIcon'
import { store } from '@/store'
import { selectSelectedMenuKey, setSelectedMenuKey } from '@/store/slice/layout'
import { localStg } from '@/utils/storage'
import { UserOutlined } from '@ant-design/icons'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

import { getAllRoutes } from '@/store/slice/route'
import { logoutNow } from '@/utils/auth'
import { openChatConversationWindow } from '@/utils/chatWindow'
import { readPersistedSpaceId } from '@/utils/spaceStorage'
import { Dropdown, Layout } from 'antd'
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
    } else if (path.startsWith('/workbench')) {
      matchedName = 'assistant-manage_assistant-config';
    } else if (path.startsWith('/component')) {
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

console.log(selectedMenuKey);

  return (
    <Sider width="80px" className="h-full bg-[#EDF1FF] border-r border-[#E0E5F5] dark:border-[#333]">
      <div className="flex h-full flex-col justify-between items-center py-[1.5rem]">
        <div className=" flex items-center justify-center cursor-pointer" onClick={redirectHome}>
          <img src={appLogo} alt="ABI Logo" className="h-14 w-14 rounded-full shadow-[0_0.625rem_1.5rem_rgba(51,102,255,0.28)]" />
        </div>
        <div className="flex gap-1 flex-col absolute top-[40%] translate-y-[-50%]">
          {primaryMenuData.map((item) => {
            
            const isActive = item.name !== selectedMenuKey
            return (
              <div
                key={item.key}
                onClick={() => {
                  if(item.key==='chat-ui') {
                    openChatConversationWindow({ spaceId: effectiveSpaceId || undefined })
                    return
                  }
                  dispatch(setSelectedMenuKey(item.name))
                  router.push(item.url)
                }}
                className={`flex items-center px-3 py-[10px] flex-col gap-[6px] cursor-pointer rounded-[8px] transition-colors ${!isActive ? 'bg-[#DDE4F8] text-[#5C7DF7]' : 'text-[#8494AD] hover:text-[#5C7DF7] hover:bg-[rgba(0,0,0,0.04)]'}`}
              >
                <SvgIcon localIcon={item.icon} style={{ fontSize: 20 }} />
                <span style={{ fontSize: '0.75rem' }}>{item.label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center  gap-6 flex-col text-[#848FA2]">
          <Dropdown trigger={['click']} menu={{ items: userItems(), onClick: handleMenuClick }}>
            <APopover content={'个人中心'}>
            <img src={userIcon} className="h-7 w-7" />
            </APopover>
          </Dropdown>
        </div>
      </div>
    </Sider>
  )
})

export default GlobalSider
