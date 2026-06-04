import './style.css'
import ClassNames from 'classnames'
import KeepAlive, { useKeepAliveRef } from 'keepalive-for-react'
import { Breadcrumb } from 'antd';

import { getReloadFlag } from '@/store/slice/app'
import { getRemoveCacheKey, selectCacheRoutes } from '@/store/slice/route'
import { getThemeSettings } from '@/store/slice/theme'
import { GLOBAL_SIDER_MENU_ID, hideMenuRoute } from '@/constants/app'
import { readPersistedSpaceName } from '@/utils/spaceStorage'
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

  const themeSetting = useAppSelector(getThemeSettings)

  const transitionName = themeSetting.page.animate ? themeSetting.page.animateMode : ''

  const { allMenus: menus } = useMixMenuContext()
  const breadcrumb = getBreadcrumbsByRoute(route, menus)
  const breadcrumbItems = breadcrumb.slice(-2).map(item => ({
    title: item.label as React.ReactNode
  }))

  useUpdateEffect(() => {
    if (!aliveRef.current || !removeCacheKey) return

    aliveRef.current.destroy(removeCacheKey)
  }, [removeCacheKey])

  useUpdateEffect(() => {
    aliveRef.current?.refresh()
  }, [reload])

  return (
    <div className="flex min-w-0 bg-white">
      {!hideMenuRoute.includes(route.name!) && <div className={'shrink-0 bg-[#F9F9F9] dark:bg-[#1a1a1a] border-r border-[#E8E8E8] dark:border-[#333] h-[100vh]'} id={GLOBAL_SIDER_MENU_ID} />}
      <div className={ClassNames('flex-1 min-w-0 h-screen relative flex flex-col')}>
        {!hideMenuRoute.includes(route.name!) && (
          <div className="flex items-center justify-between px-6 pt-4 pb-4 bg-[#F9F9F9]">
            <Breadcrumb items={breadcrumbItems} style={{ fontSize: '15px' }} />
            <span style={{ color: '#666', fontSize: '15px' }}>
              当前空间：
              <strong style={{ fontWeight: 600 }}>
                {readPersistedSpaceName()}
              </strong>
            </span>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-auto">
          {/* <KeepAlive activeCacheKey={cacheKey} aliveRef={aliveRef} cacheNodeClassName={reload ? transitionName : ''} include={cacheKeys}> */}
            {currentOutlet}
          {/* </KeepAlive> */}
        </div>
      </div>
    </div>
  )
})

export default GlobalContent
