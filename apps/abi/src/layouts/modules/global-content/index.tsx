import './style.css'
import ClassNames from 'classnames'
import KeepAlive, { useKeepAliveRef } from 'keepalive-for-react'
import { Breadcrumb, Dropdown, Spin, Empty } from 'antd';
import { CheckOutlined, DownOutlined, MessageOutlined, SearchOutlined, TeamOutlined } from '@ant-design/icons';
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
import { useRouterPush } from '@/hooks/common/routerPush'

const SPACE_AVATAR_COLORS = [
  { bg: 'linear-gradient(135deg, #6366f1, #5b7cf7)', shadow: 'rgba(91,124,247,0.35)' },
  { bg: 'linear-gradient(135deg, #a855f7, #8b5cf6)', shadow: 'rgba(139,92,246,0.35)' },
  { bg: 'linear-gradient(135deg, #10b981, #059669)', shadow: 'rgba(16,185,129,0.35)' },
  { bg: 'linear-gradient(135deg, #f59e0b, #f97316)', shadow: 'rgba(245,158,11,0.35)' },
  { bg: 'linear-gradient(135deg, #ec4899, #f43f5e)', shadow: 'rgba(236,72,153,0.35)' },
  { bg: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', shadow: 'rgba(6,182,212,0.35)' },
];

// 按列表顺序取色，保证相邻空间不撞色
function getSpaceColorByIndex(index: number) {
  const len = SPACE_AVATAR_COLORS.length;
  return SPACE_AVATAR_COLORS[((index % len) + len) % len];
}

function getSpaceInitial(name: string) {
  const trimmed = (name || '').trim();
  return trimmed ? trimmed.charAt(0).toUpperCase() : '?';
}

// 在菜单树中查找（支持短格式 key）
function findInMenuTree(menuList: any[], key: string): any {
  for (const m of menuList) {
    if (m?.key === key) return m;
    if (m?.children?.length) {
      const found = findInMenuTree(m.children, key);
      if (found) return found;
    }
  }
  return null;
}

// 获取第一个叶子菜单
function getFirstLeafMenu(menu: any): any {
  if (!menu?.children?.length) return menu;
  return getFirstLeafMenu(menu.children[0]);
}

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
  const routerPush = useRouterPush();
  const routerPushRef = useRef(routerPush);
  routerPushRef.current = routerPush;
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
  const [spaceSearch, setSpaceSearch] = useState('');

  const { data: curspaceList, run: getSpaceList } = useRequest(spaceList, {
    manual: true
  });

  const spaceOptions =
    curspaceList?.map((space: any) => ({
      label: space.spaceName,
      value: space.spaceId,
      key: space.spaceId,
      remark: space.remark,
      userCount: space.userCount,
      chatCount: space.chatCount,
    })) || [];

  const filteredSpaceOptions = (() => {
    const keyword = spaceSearch.trim().toLowerCase();
    if (!keyword) return spaceOptions;
    return spaceOptions.filter((space: any) =>
      String(space.label || '').toLowerCase().includes(keyword),
    );
  })();

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
              if (isLast) return;

              const menuItem = findInMenuTree(menus, item.key);
              if (menuItem?.children?.length) {
                const firstLeaf = getFirstLeafMenu(menuItem);
                if (firstLeaf?.key) {
                  routerPushRef.current.routerPushByKeyWithMetaQuery(firstLeaf.key);
                  return;
                }
              }

              push(path);
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
                  <div className="space-picker-panel">
                    <div className="space-picker-top">
                      <div className="space-picker-header">
                        <span className="space-picker-title">选择工作空间</span>
                        <span className="space-picker-count">{spaceOptions.length} 个空间</span>
                      </div>
                      <div className="space-picker-search">
                        <SearchOutlined className="space-picker-search-icon" />
                        <input
                          className="space-picker-search-input"
                          placeholder="搜索空间..."
                          value={spaceSearch}
                          onChange={(e) => setSpaceSearch(e.target.value)}
                        />
                      </div>
                    </div>
                    <Spin spinning={!curspaceList}>
                      <div className="space-picker-list">
                        {filteredSpaceOptions.length ? (
                          filteredSpaceOptions.map((space: any) => {
                            const isActive = space.value === currentSpace;
                            const realIndex = spaceOptions.findIndex((s: any) => s.value === space.value);
                            const color = getSpaceColorByIndex(realIndex >= 0 ? realIndex : 0);
                            return (
                              <button
                                type="button"
                                key={space.key}
                                className={`space-picker-item ${isActive ? 'active' : ''}`}
                                onClick={() => handleSpaceClick(space.value, space.label)}
                              >
                                <span
                                  className="space-picker-avatar"
                                  style={{ background: color.bg, boxShadow: `0 4px 10px ${color.shadow}` }}
                                >
                                  {getSpaceInitial(space.label)}
                                </span>
                                <span className="space-picker-item-main">
                                  <span className="space-picker-item-name">{space.label}</span>
                                  <span className="space-picker-item-desc">
                                    {(space.remark || '').trim() || '空间暂无描述'}
                                  </span>
                                  <span className="space-picker-item-meta">
                                    <TeamOutlined />
                                    <span>{space.userCount ?? 0} 成员</span>
                                    <MessageOutlined style={{ marginLeft: 10 }} />
                                    <span>{space.chatCount ?? 0} 对话</span>
                                  </span>
                                </span>
                                {isActive ? (
                                  <span className="space-picker-check">
                                    <CheckOutlined />
                                  </span>
                                ) : null}
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
                  <span
                    className="space-picker-avatar space-picker-avatar--sm"
                    style={{ background: getSpaceColorByIndex(Math.max(spaceOptions.findIndex((s: any) => s.value === currentSpace), 0)).bg }}
                  >
                    {getSpaceInitial(currentSpaceName || '')}
                  </span>
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
