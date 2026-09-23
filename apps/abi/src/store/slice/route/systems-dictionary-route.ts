import type { ElegantConstRoute } from '@elegant-router/types'

const MANAGE_ROUTE_NAME = 'manage'
const SYSTEMS_ROUTE_NAME = 'systems'
const DICTIONARY_ROUTE_NAME = 'systems_data-dictionary'

function hasRouteName(routes: readonly ElegantConstRoute[], routeName: string): boolean {
  return routes.some(route => {
    if (String(route.name) === routeName) return true
    return route.children?.length ? hasRouteName(route.children as ElegantConstRoute[], routeName) : false
  })
}

/** 系统字典沿用系统管理权限：后端返回 manage 时，补入本地 systems 字典路由。 本地路由独立于后端菜单配置，且不会带入 systems 下的其他静态页面。 */
export function appendSystemsDictionaryRoute(
  routes: ElegantConstRoute[],
  staticRoutes: ElegantConstRoute[]
): ElegantConstRoute[] {
  if (!routes.some(route => String(route.name) === MANAGE_ROUTE_NAME)) return routes
  if (hasRouteName(routes, DICTIONARY_ROUTE_NAME)) return routes

  const staticSystemsRoute = staticRoutes.find(route => String(route.name) === SYSTEMS_ROUTE_NAME)
  const staticDictionaryRoute = (staticSystemsRoute?.children as ElegantConstRoute[] | undefined)?.find(
    route => String(route.name) === DICTIONARY_ROUTE_NAME
  )
  if (!staticSystemsRoute || !staticDictionaryRoute) return routes

  const hasSystemsParent = routes.some(route => String(route.name) === SYSTEMS_ROUTE_NAME)
  if (!hasSystemsParent) {
    return [...routes, { ...staticSystemsRoute, children: [staticDictionaryRoute] }]
  }

  return routes.map(route => {
    if (String(route.name) !== SYSTEMS_ROUTE_NAME) return route
    return {
      ...route,
      children: [...((route.children ?? []) as ElegantConstRoute[]), staticDictionaryRoute]
    }
  })
}
