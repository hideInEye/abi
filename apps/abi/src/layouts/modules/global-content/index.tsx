import './style.css'
import ClassNames from 'classnames'
import KeepAlive, { useKeepAliveRef } from 'keepalive-for-react'
import { Breadcrumb, Dropdown, Spin, Empty } from 'antd';
import { CheckOutlined, DownOutlined } from '@ant-design/icons';
import { useRequest } from '@sa/hooks';
import { spaceList } from '@/service/api/data-space';
import { useSpaceSwitch } from '@/hooks/business/useSpaceSwitch';

import { getReloadFlag, getSpaceId } from '@/store/slice/app'
import { getRemoveCacheKey, selectCacheRoutes } from '@/store/slice/route'
import { getThemeSettings } from '@/store/slice/theme'
import { GLOBAL_SIDER_MENU_ID, hideMenuRoute } from '@/constants/app'
import { useRoute, useRouter } from '~/packages/simple-router/src'
import WorkbenchEmpty from '@/components/stateless/common/WorkbenchEmpty'

import { $t } from '@/locales';
import { useMixMenuContext } from '@/hooks/common/menu'

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
  const { push } = useRouter()
  const location = useLocation()
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
  };

  const themeSetting = useAppSelector(getThemeSettings)

  const transitionName = themeSetting.page.animate ? themeSetting.page.animateMode : ''

  const { allMenus: menus } = useMixMenuContext()

  // 构建面包屑：完全基于 pathname 推导（不依赖 route.matched，因为 simple-router 中 matched 可能为空）
  const breadcrumbItems = useMemo(() => {
    const pathname = location.pathname;
    const pathSegs = pathname.split('/').filter(Boolean);

    // 去掉末尾的数字ID段
    if (pathSegs.length > 0 && /^\d+$/.test(pathSegs[pathSegs.length - 1])) {
      pathSegs.pop();
    }

    if (pathSegs.length === 0) return [];

    // 最后一个段的后缀处理（-operate → 去掉后缀得到兄弟菜单名）
    const lastSeg = pathSegs[pathSegs.length - 1];
    const suffixes = ['-operate', '-view', '-edit', '-detail', '-create'];
    let lastMenuSeg = lastSeg;
    for (const suffix of suffixes) {
      if (lastSeg.endsWith(suffix)) {
        lastMenuSeg = lastSeg.slice(0, -suffix.length);
        break;
      }
    }

    // 构建路径段列表（最后一段用处理后的菜单段名）
    const menuSegs = pathSegs.map((seg, i) => i === pathSegs.length - 1 ? lastMenuSeg : seg);

    // 在菜单树中查找（支持短格式 key，如 data-preparation 而非 workbench_data-preparation）
    const findInMenuTree = (menuList: any[], key: string): any => {
      for (const m of menuList) {
        if (m?.key === key) return m;
        if (m?.children?.length) {
          const found = findInMenuTree(m.children, key);
          if (found) return found;
        }
      }
      return null;
    };

    // 逐级构建面包屑，在每一级尝试多种 key 格式
    const items: { label: any; key: string }[] = [];
    for (let i = 0; i < menuSegs.length; i++) {
      const seg = menuSegs[i];
      const parentKey = i > 0 && items.length > 0 ? items[items.length - 1].key : '';

      // 候选 key：长格式（父+子）、短格式（仅当前段）
      const candidates: string[] = [];
      if (parentKey) {
        candidates.push(`${parentKey}_${seg}`);
      }
      candidates.push(seg);

      let found: any = null;
      for (const key of candidates) {
        found = findInMenuTree(menus, key);
        if (found) break;
      }

      if (found) {
        items.push({ label: found.title || found.label, key: found.key });
      } else if (parentKey) {
        // 未找到菜单项时，尝试 i18n 翻译
        const fullKey = [...pathSegs.slice(0, i), seg].join('_');
        const candidateKeys = [fullKey, `${parentKey}_${seg}`, seg];
        let label = '';
        for (const k of candidateKeys) {
          const translated = $t(`route.${k}`);
          if (translated && translated !== `route.${k}`) {
            label = translated;
            break;
          }
        }
        items.push({ label: label || seg, key: `${parentKey}_${seg}` });
      }
    }

    return items.map((item, index) => {
      const isLast = index === items.length - 1;
      // 构建每级的路径
      const pathParts = item.key.split('_');
      const path = '/' + pathParts.join('/');
      
      return {
        title: (
          <span 
            style={{ 
              color: isLast ? '#1a2744' : '#768a9f', 
              fontWeight: isLast ? 600 : 400,
              cursor: isLast ? 'default' : 'pointer',
              transition: 'color 0.2s'
            }}
            onClick={() => {
              if (!isLast) {
                push(path);
              }
            }}
            onMouseEnter={(e) => {
              if (!isLast) {
                e.currentTarget.style.color = '#5b7cf7';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLast) {
                e.currentTarget.style.color = '#768a9f';
              }
            }}
          >
            {item.label}
          </span>
        )
      };
    });
  }, [menus, location.pathname, push])

  useUpdateEffect(() => {
    if (!aliveRef.current || !removeCacheKey) return

    aliveRef.current.destroy(removeCacheKey)
  }, [removeCacheKey])

  useUpdateEffect(() => {
    aliveRef.current?.refresh()
  }, [reload])

  return (
    <div className="flex min-w-0" style={{ background: 'var(--abi-card-bg)' }}>
      {!hideMenuRoute.includes(route.name!) && <div className={'shrink-0 dark:bg-[#1a1a1a] dark:border-[#333] h-[100vh] transition-all duration-300'} id={GLOBAL_SIDER_MENU_ID} style={{ background: 'var(--abi-card-bg)' }} />}
      <div className={ClassNames('flex-1 min-w-0 h-screen relative flex flex-col')}>
        {!hideMenuRoute.includes(route.name!) && (
          <div className="px-6 pt-4 pb-3 page-header-container">
            <div className="flex items-center justify-between">
              <Breadcrumb items={breadcrumbItems} separator="/" className="abi-breadcrumb" />
              <Dropdown
                open={spaceDropdownOpen}
                onOpenChange={setSpaceDropdownOpen}
                trigger={['click']}
                dropdownRender={() => (
                  <div className="abi-space-dropdown">
                    <div className="abi-space-dropdown-title">空间</div>
                    <Spin spinning={!curspaceList}>
                      <div className="max-h-[280px] overflow-y-auto">
                        {spaceOptions.length ? (
                          spaceOptions.map((space: any) => {
                            const isActive = space.value === currentSpace;
                            return (
                              <button
                                type="button"
                                key={space.key}
                                className={`abi-space-dropdown-item ${isActive ? 'active' : ''}`}
                                onClick={() => handleSpaceClick(space.value, space.label)}
                              >
                                <span className="truncate">{space.label}</span>
                                {isActive ? <CheckOutlined style={{ fontSize: 13, flexShrink: 0 }} /> : null}
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
                <div className="abi-space-trigger">
                  <span className="abi-space-trigger-dot" />
                  <span className="abi-space-trigger-name">{currentSpaceName || '选择空间'}</span>
                  <DownOutlined className="abi-space-trigger-arrow" />
                </div>
              </Dropdown>
            </div>
          </div>
        )}
        <div className="flex-1 min-h-0 overflow-auto page-content-area">
          {/* <KeepAlive activeCacheKey={cacheKey} aliveRef={aliveRef} cacheNodeClassName={reload ? transitionName : ''} include={cacheKeys}> */}
            {(route.name === 'workbench' || route.name === 'component') ? <WorkbenchEmpty /> : currentOutlet}
          {/* </KeepAlive> */}
        </div>
      </div>
    </div>
  )
})

export default GlobalContent
