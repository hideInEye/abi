import {
  AndroidOutlined,
  AppleOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons'
import { Suspense, createElement, forwardRef, lazy } from 'react'
import type { ComponentPropsWithoutRef } from 'react'

type OutlinedIcon = typeof QuestionCircleOutlined

const outlinedIconRegistry: Readonly<Record<string, OutlinedIcon>> = {
  AndroidOutlined,
  AppleOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  SearchOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined
}

export const defaultOutlinedIcon = QuestionCircleOutlined

const outlinedIconLoaders = import.meta.glob<{ default: OutlinedIcon }>(
  '../../node_modules/@ant-design/icons/es/icons/*Outlined.js'
)
const lazyOutlinedIcons = new Map<string, OutlinedIcon>()

export function getOutlinedIcon(iconName?: string): OutlinedIcon | undefined {
  if (!iconName) return undefined
  if (Object.hasOwn(outlinedIconRegistry, iconName)) return outlinedIconRegistry[iconName]

  const cachedIcon = lazyOutlinedIcons.get(iconName)
  if (cachedIcon) return cachedIcon

  const loader = outlinedIconLoaders[`../../node_modules/@ant-design/icons/es/icons/${iconName}.js`]
  if (!loader) return undefined

  // 菜单选择器允许任意 Outlined 图标；只有实际渲染时才加载，Suspense 限定在单个图标内。
  const LazyIcon = lazy(loader)
  const Icon = forwardRef<HTMLSpanElement, ComponentPropsWithoutRef<OutlinedIcon>>((props, ref) =>
    createElement(
      Suspense,
      { fallback: createElement(defaultOutlinedIcon, props) },
      createElement(LazyIcon, { ...props, ref })
    )
  )
  Icon.displayName = iconName
  lazyOutlinedIcons.set(iconName, Icon)
  return Icon
}
