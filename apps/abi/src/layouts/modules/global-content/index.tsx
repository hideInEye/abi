import './style.css'
import ClassNames from 'classnames'
import KeepAlive, { useKeepAliveRef } from 'keepalive-for-react'
import { Breadcrumb, Dropdown, Typography, Spin, Empty } from 'antd';
import { CheckOutlined, DownOutlined } from '@ant-design/icons';
import { useRequest } from '@sa/hooks';
import { spaceList } from '@/service/api/data-space';
import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch';

import { getReloadFlag, getSpaceId } from '@/store/slice/app'
import { getRemoveCacheKey, selectCacheRoutes } from '@/store/slice/route'
import { getThemeSettings } from '@/store/slice/theme'
import { GLOBAL_SIDER_MENU_ID, hideMenuRoute } from '@/constants/app'
import { useRoute } from '~/packages/simple-router/src'

import { useMixMenuContext } from '@/hooks/common/menu'
import { getBreadcrumbsByRoute } from '../global-breadcrumb/shared'

interface Props {
  /** Show padding for content */
  closePadding?: boolean
}

const useGetCacheKey = () => {
  const location = useLocation()

  const cacheKey = (location.pathname + location.search).slice(1).split('/').join('_')

  return cacheKey
}

const GlobalContent: FC<Props> = memo(({ closePadding }) => {
  const currentOutlet = useOutlet()
  const route = useRoute()
  const aliveRef = useKeepAliveRef()

  const removeCacheKey = useAppSelector(getRemoveCacheKey)

  const cacheKeys = useAppSelector(selectCacheRoutes)

  const reload = useAppSelector(getReloadFlag)

  const cacheKey = useGetCacheKey()

  const currentSpaceId = useAppSelector(getSpaceId);
  const { switchToSpace } = useSpaceSwitch();
  const [currentSpaceName, setCurrentSpaceName] = useState('');
  const [currentSpace, setCurrentSpace] = useState<number | null>(currentSpaceId);
  const [spaceDropdownOpen, setSpaceDropdownOpen] = useState(false);

  const { data: curspaceList, run: getSpaceList } = useRequest(spaceList, {
    manual: true
  });

  const spaceOptions =
    curspaceList?.map((space: any) => ({
      label: space.spaceName,
      value: space.spaceId,
      key: space.spaceId,
    })) || [];

  useEffect(() => {
    getSpaceList({
      isAsc: 'desc',
      orderByColumn: 'spaceId',
      pageNum: 1,
      pageSize: 100000
    });
  }, []);

  useEffect(() => {
    if (Array.isArray(curspaceList) && currentSpace) {
      const space = curspaceList.find((s: any) => s.spaceId === currentSpace);
      if (space) {
        setCurrentSpaceName(space.spaceName);
      }
    }
  }, [curspaceList, currentSpace]);

  // 同步 Redux store 中的 spaceId 到本地状态
  useEffect(() => {
    if (currentSpaceId) {
      setCurrentSpace(currentSpaceId);
    }
  }, [currentSpaceId]);

  const handleSpaceClick = async (spaceId: number, spaceName: string) => {
    // 点击当前已选中的空间，仅关闭下拉
    if (spaceId === currentSpace) {
      setSpaceDropdownOpen(false);
      return;
    }
    setCurrentSpaceName(spaceName);
    setCurrentSpace(spaceId);
    setSpaceDropdownOpen(false);
    await switchToSpace(spaceId);
    // 刷新当前页面，使各组件基于新的 spaceId 重新请求数据
    window.location.reload();
  };

  const themeSetting = useAppSelector(getThemeSettings)

  const transitionName = themeSetting.page.animate ? themeSetting.page.animateMode : ''

  const { allMenus: menus } = useMixMenuContext()
  const breadcrumb = getBreadcrumbsByRoute(route, menus)
  const breadcrumbItems = breadcrumb.slice(-2).map((item, index) => {
    const isLast = index === breadcrumb.slice(-2).length - 1
    return {
      title: <span style={{ color: isLast ? '#1a2744' : '#768a9f',fontWeight: isLast ? 600 : 400,}}>{item.label}</span>
    }
  })

  useUpdateEffect(() => {
    if (!aliveRef.current || !removeCacheKey) return

    aliveRef.current.destroy(removeCacheKey)
  }, [removeCacheKey])

  useUpdateEffect(() => {
    aliveRef.current?.refresh()
  }, [reload])

  return (
    <div className="flex min-w-0" style={{ background: 'linear-gradient(135deg, #F0F4FF 0%, #EFF3FF 45%, #EFF2FF 100%)' }}>
      {!hideMenuRoute.includes(route.name!) && <div className={'shrink-0 bg-[linear-gradient(135deg,#F0F4FF_0%,#EFF3FF_45%,#EFF2FF_100%)] dark:bg-[#1a1a1a] border-r border-[rgba(130,140,200,0.12)] dark:border-[#333] h-[100vh] transition-all duration-300'} id={GLOBAL_SIDER_MENU_ID} />}
      <div className={ClassNames('flex-1 min-w-0 h-screen relative flex flex-col')}>
        {!hideMenuRoute.includes(route.name!) && (
          <div className="px-6 pt-4 pb-4 page-header-container">
            <div className="flex items-center justify-between">
              <Breadcrumb items={breadcrumbItems} className="abi-breadcrumb" />
              <Dropdown
                open={spaceDropdownOpen}
                onOpenChange={setSpaceDropdownOpen}
                trigger={['click']}
                dropdownRender={() => (
                  <div className="w-[286px] max-w-[calc(100vw-32px)] rounded-2xl border border-[#edf0f5] bg-[#FCFDFF] p-3 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
                    <Typography.Text className="mb-2 block px-2 text-[15px] font-semibold text-[#1f2937]">
                      空间
                    </Typography.Text>
                    <Spin spinning={!curspaceList}>
                      <div className="max-h-[320px] overflow-y-auto pr-1">
                        {spaceOptions.length ? (
                          spaceOptions.map((space: any) => {
                            const isActive = space.value === currentSpace;
                            return (
                              <button
                                type="button"
                                key={space.key}
                                className={[
                                  'mb-1 flex w-full items-center justify-between rounded-xl bg-transparent px-3 py-2.5 text-left transition-colors hover:bg-[#eef4ff]',
                                  isActive ? 'text-[#5b7cf7]' : 'text-[#1a2744]',
                                ].join(' ')}
                                onClick={() => handleSpaceClick(space.value, space.label)}
                              >
                                <span className="truncate text-[14px]">{space.label}</span>
                                {isActive ? <CheckOutlined className="text-[14px]" /> : null}
                              </button>
                            );
                          })
                        ) : (
                          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无空间" className="!my-2" />
                        )}
                      </div>
                    </Spin>
                  </div>
                )}
              >
                <div className="flex items-center gap-2 px-4 py-1.5 bg-white/45 border border-white/60 rounded-full cursor-pointer hover:bg-white/75 transition-all text-sm font-semibold text-[#3e5068]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] shadow-[0_0_6px_rgba(16,185,129,0.4)] flex-shrink-0"></span>
                  <span className="truncate max-w-[120px]">{currentSpaceName || '选择空间'}</span>
                  <DownOutlined className="text-xs text-[#768a9f]" />
                </div>
              </Dropdown>
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-auto page-content-area">
          {/* <KeepAlive activeCacheKey={cacheKey} aliveRef={aliveRef} cacheNodeClassName={reload ? transitionName : ''} include={cacheKeys}> */}
            {currentOutlet}
          {/* </KeepAlive> */}
        </div>
      </div>
    </div>
  )
})

export default GlobalContent
