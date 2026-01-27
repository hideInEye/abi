// src/utils/icon-converter.ts
import * as antdIcons from '@ant-design/icons'
import React from 'react'

// 创建安全的图标映射
const safeIcons = new Map<string, React.FC<any>>()

// 将 Ant Design 图标添加到安全映射
Object.entries(antdIcons).forEach(([name, iconComponent]) => {
  if (typeof iconComponent === 'function' && name.endsWith('Outlined')) {
    safeIcons.set(name, iconComponent)
  }
})

// 添加默认图标
const DefaultIcon = antdIcons.QuestionCircleOutlined

/**
 * 图标转换器
 */
export const safeConvertToIcon = (iconName?: string, props?: React.ComponentProps<typeof DefaultIcon>): React.ReactElement | null => {
  if (!iconName) return null

  const IconComponent = safeIcons.get(iconName)
  if (IconComponent) {
    return React.createElement(IconComponent, props)
  }

  return React.createElement(DefaultIcon, props)
}

// 路由配置中的 icon 字段转换器
export const routeIconConverter = (iconName?: string) => {
  return safeConvertToIcon(iconName, { className: 'anticon' })
}

export function convertRuoYiToSoybean(ruoYiRoutes: any[]): any[] {
  const VIEW_PREFIX = 'view.'

  const isLayoutWrap = (n: any) => n?.path === '/' && n?.component === 'Layout' && Array.isArray(n.children)

  // 顶层 path 要 / 开头；子路由 path 用相对（react-router更稳）
  const normalizeRoutePath = (rawPath: string, isTop: boolean) => {
    if (!rawPath) return isTop ? '/' : ''
    if (isTop) return rawPath.startsWith('/') ? rawPath : `/${rawPath}`
    return rawPath.replace(/^\//, '')
  }

  // 拼 fullPath：child 如果是绝对路径就直接用；否则 parent/child
  const joinFullPath = (parentFull: string, routePath: string) => {
    if (!routePath) return parentFull || '/'
    if (routePath.startsWith('/')) return routePath // 顶层绝对或子节点绝对：直接覆盖
    const base = (parentFull || '/').replace(/\/+$/, '')
    return `${base}/${routePath}`.replace(/\/+/g, '/')
  }

  // /workbench/assistant-manage/assistant-config -> workbench_assistant-manage_assistant-config
  // 去掉 :id 这种参数段，避免 key 对不上 auto-route
  const fullPathToViewKey = (fullPath: string) => {
    const clean = (fullPath || '').split('?')[0].replace(/\/+$/, '').replace(/^\//, '')
    const segs = clean
      .split('/')
      .filter(Boolean)
      .filter((s) => !s.startsWith(':'))
    return segs.join('_')
  }

  const attachQueryParamAsPathParam = (path: string, query?: string) => {
    if (!query) return path
    return `${path.replace(/\/+$/, '')}/:${query}`
  }

  const build = (node: any, parentFullPath: string, isTop: boolean): any => {
    const routePath = normalizeRoutePath(node?.path ?? '', isTop)
    const fullPath = joinFullPath(parentFullPath, routePath)

    const hasChildren = Array.isArray(node.children) && node.children.length > 0

    const isLayout = node.component === 'Layout'
    const isParentView = node.component === 'ParentView'

    const viewKey = fullPathToViewKey(fullPath)

    const route: any = {
      name: ((node.name || viewKey || routePath) as string).toLowerCase(),
      path: attachQueryParamAsPathParam(routePath, node.query),
      meta: {
        title: node.meta?.title,
        icon: node.meta?.icon,
        hideInMenu: !!node.hidden,
        noCache: !!node.meta?.noCache,
        link: node.meta?.link ?? null,
      },
    }

    // 容器节点（Layout / ParentView / any hasChildren）
    if (isLayout) {
      route.component = isTop ? 'layout.base' : 'layout.blank'
    } else if (isParentView || hasChildren) {
      route.component = 'layout.blank'
    } else {
      route.component = isTop ? `layout.base$view.${viewKey}` : `view.${viewKey}`
    }

    if (hasChildren) {
      route.children = node.children.map((c: any) => build(c, fullPath, false))
    }

    return route
  }

  const out: any[] = []

  // ✅ 关键：拍扁若依的 “/ + Layout + children:[绝对path叶子]” 包裹
  for (const r of ruoYiRoutes) {
    if (isLayoutWrap(r)) {
      for (const c of r.children) {
        // children 里通常是 /home 这种绝对path —— 当作顶层处理
        out.push(build(c, '/', true))
      }
    } else {
      out.push(build(r, '/', true))
    }
  }

  return out
}

/**
 * 筛选出数组a中存在的所有数组b项，并用数组a的内容重组成数组c
 * @param a 主路由数组
 * @param b 需要筛选的路由数组
 * @returns 重组后的路由数组c
 */
export function filterAndReconstructRoutes(a: any[], b: any[]) {
  const aRouteMap = new Map<string, any>()

  const traverseAndMap = (routes: any[]) => {
    for (const route of routes) {
      if (route?.name) aRouteMap.set(route.name, route)
      if (route.children?.length) traverseAndMap(route.children)
    }
  }

  traverseAndMap(a)

  const reconstruct = (routes: any[]): any[] => {
    return routes
      .filter((r) => r?.name && aRouteMap.has(r.name))
      .map((r) => {
        const matched = aRouteMap.get(r.name)
        const next = { ...matched }

        if (r.children?.length) {
          next.children = reconstruct(r.children)
        }
        return next
      })
  }

  return reconstruct(b)
}
