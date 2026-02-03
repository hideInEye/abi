import appLogo from '@/assets/imgs/home/home_logo.png'
import userIcon from '@/assets/imgs/home/user.png'
import { itemMap, primaryMenuData, primaryMenuMap } from '@/constants/layout/global_side'
import { store } from '@/store'
import { selectSelectedMenuKey, setSelectedMenuKey } from '@/store/slice/layout'
import { localStg } from '@/utils/storage'
import { SwapOutlined, UserOutlined } from '@ant-design/icons'
import { qiankunWindow } from 'vite-plugin-qiankun/dist/helper'

import { resetStore } from '@/store/slice/auth'
import { getAllRoutes } from '@/store/slice/route'
import { handleLoginExpired } from '@/utils/auth'
import { Dropdown, Layout } from 'antd'
import { useRoute, useRouter } from '~/packages/simple-router/src'
import { spaceList } from '@/service/api'
import { MenuProps } from 'antd/lib'
import { getSpaceId } from '@/store/slice/app'
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
  const { switchToSpace } = useSpaceSwitch()
  const [selectedSpaceName, setSelectedSpaceName] = useState('')

  const { data: curspaceList, run: getSpaceList } = useRequest(spaceList, {
    manual: true,
  })
  useEffect(() => {
    if (primaryMenuMap.get(route.name)) {
      dispatch(setSelectedMenuKey(route.name))
    }
  }, [route])

  useEffect(() => {
    if (curspaceList && curspaceList.data && curspaceList.data.length > 0 && !selectedSpaceName) {
      const currentSpace = curspaceList.data.find((space: any) => space.spaceId === spaceId)
      if (currentSpace) {
        setSelectedSpaceName(currentSpace.spaceName)
      }
    }
  }, [curspaceList,spaceId])

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
        key: 'system',
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
    console.log(data, '===')
    setSelectedSpaceName(data?.label || '')

    switchToSpace(Number(e?.key))
  }

  return (
    <Sider width="5.5rem" className="h-full bg-white">
      <div className="flex h-full flex-col justify-between items-center py-6">
        <div className="mt-6 mb-10 flex items-center justify-center cursor-pointer" onClick={redirectHome}>
          <img src={appLogo} alt="ABI Logo" className="h-14 w-14 rounded-full shadow-[0_0.625rem_1.5rem_rgba(51,102,255,0.28)]" />
        </div>
        <div className="flex gap-[1.6875rem] flex-col text-[#848FA2]">
          {primaryMenuData.map((item) => {
            const isActive = item.name !== selectedMenuKey
            return (
              <div
                key={item.key}
                onClick={() => {
                  dispatch(setSelectedMenuKey(item.key))
                  router.push(item.url)
                }}
                className={`flex items-center px-3 py-[0.6875rem] flex-col gap-[0.5625rem] cursor-pointer ${!isActive ? 'bg-[#fff] shadow-[0_0.25rem_0.375rem_0_rgba(137,147,166,0.15)] rounded-[0.625rem] text-[#3366FF]' : ''}`}
              >
                <img src={isActive ? item.checkIcon : item.icon} alt={item.label} className="h-6 w-6" />
                <span className="text-base">{item.label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center  gap-6 flex-col text-[#848FA2]">
          <Dropdown overlayClassName="[&_.ant-dropdown-menu]:h-[20rem] h-[20rem] overflow-hidden" trigger={['click']} menu={{ items: spaceOptions, onClick: handleSpaceChange }}>
            <APopover
              content={
                <div>
                  <div className="text-balance">
                    当前空间: <span className="text-[#3366FF]">{selectedSpaceName}</span>
                  </div>
                </div>
              }
            >
              <SwapOutlined className="cursor-pointer" />
            </APopover>
          </Dropdown>
          <Dropdown menu={{ items: userItems(), onClick: handleMenuClick }}>
            <img src={userIcon} className="h-6 w-6" />
          </Dropdown>
        </div>
      </div>
    </Sider>
  )
})

export default GlobalSider
