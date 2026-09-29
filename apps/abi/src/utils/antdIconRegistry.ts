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
  UserOutlined,
} from '@ant-design/icons'

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
  UserOutlined,
}

export const defaultOutlinedIcon = QuestionCircleOutlined

export function getOutlinedIcon(iconName?: string): OutlinedIcon | undefined {
  return iconName ? outlinedIconRegistry[iconName] : undefined
}
