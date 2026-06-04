import appLogo from '@/assets/imgs/home/home_logo.png'
import userIcon from '@/assets/imgs/home/users.png'
import { itemMap, primaryMenuData, primaryMenuMap } from '@/constants/layout/global_side'
import { store } from '@/store'
import { selectSelectedMenuKey, setSelectedMenuKey } from '@/store/slice/layout'
import { localStg } from '@/utils/storage'
import swapIcon from '@/assets/imgs/home/切换币种.png'
import { UserOutlined } from '@ant-design/icons'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

import { resetStore } from '@/store/slice/auth'
import { getAllRoutes } from '@/store/slice/route'
import { handleLoginExpired } from '@/utils/auth'
import { openChatConversationWindow } from '@/utils/chatWindow'
import { persistSpaceName, readPersistedSpaceId, readPersistedSpaceName } from '@/utils/spaceStorage'
import { Dropdown, Layout } from 'antd'
import { useRoute, useRouter } from '~/packages/simple-router/src'
import { spaceList } from '@/service/api'
import { MenuProps } from 'antd/lib'
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
  const { switchToSpace } = useSpaceSwitch()
  const [selectedSpaceName, setSelectedSpaceName] = useState(() => readPersistedSpaceName())

  const { data: curspaceList, run: getSpaceList } = useRequest(spaceList, {
    manual: true,
  })
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
    if (curspaceList && curspaceList.data && curspaceList.data.length > 0 ) {
      const currentSpace = curspaceList.data.find((space: any) => space.spaceId === effectiveSpaceId)
      if (currentSpace) {
        setSelectedSpaceName(currentSpace.spaceName)
        persistSpaceName(currentSpace.spaceName)
      }
    }
  }, [curspaceList,effectiveSpaceId])

  useEffect(() => {
    if (!spaceId && effectiveSpaceId) {
      dispatch(changeSpaceId(effectiveSpaceId))
    }
  }, [dispatch, effectiveSpaceId, spaceId])

  useEffect(() => {
    getSpaceList({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum: 1,
      pageSize: 100000,
    })
  }, [])

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
            store.dispatch(resetStore())
            handleLoginExpired()
          },
          title: t('common.tip'),
        })
      }
      logout()
    }
  }

  const spaceOptions =
    (curspaceList &&
      curspaceList?.data?.map((space: any) => ({
        label: space.spaceName,
        value: space.spaceId,
        key: space.spaceId,
      }))) ||
    []

  // 添加空间切换处理函数
  const handleSpaceChange: MenuProps['onClick'] = (e) => {
    const data = spaceOptions.find((item: any) => item.key == e.key)
    setSelectedSpaceName(data?.label || '')
    persistSpaceName(data?.label) 

    switchToSpace(Number(e?.key), undefined, { redirect: true })
    dispatch(setSelectedMenuKey(''))
    router.push('/workbench')
  }
console.log(selectedMenuKey);

  return (
    <Sider width="80px" className="h-full bg-[#F2F2F0] border-r border-[#E8E8E8] dark:border-[#333]">
      <div className="flex h-full flex-col justify-between items-center py-[1.5rem]">
        <div className=" flex items-center justify-center cursor-pointer" onClick={redirectHome}>
          <img src={appLogo} alt="ABI Logo" className="h-14 w-14 rounded-full shadow-[0_0.625rem_1.5rem_rgba(51,102,255,0.28)]" />
        </div>
        <div className="flex gap-1 flex-col text-[#848FA2] absolute top-[45%] translate-y-[-50%]">
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
                className={`flex items-center px-3 py-[10px] flex-col gap-[8px] cursor-pointer rounded-[4px] transition-colors ${!isActive ? 'bg-[#E5EAFA] text-[#0B6DFF] font-semibold' : 'text-[#0E0E0E] hover:bg-[rgba(0,0,0,0.06)]'}`}
              >
                <img src={isActive ? item.checkIcon : item.icon} alt={item.label} className="h-6 w-6" />
                <span className="text-base" style={{ fontSize: '0.875rem' }}>{item.label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center  gap-6 flex-col text-[#848FA2]">
          <Dropdown overlayClassName="[&_.ant-dropdown-menu]:max-h-[20rem] max-h-[20rem]" trigger={['click']} menu={{ items: spaceOptions, onClick: handleSpaceChange }}>
            <APopover
              content={
                <div>
                  <div className="text-balance">
                    当前空间: <span className="text-[#3366FF] font-semibold">{selectedSpaceName}</span>
                  </div>
                </div>
              }
            >
              <img src={swapIcon} alt="切换空间" className="h-6 w-6 cursor-pointer" />
            </APopover>
          </Dropdown>
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
