import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'

type BrandHeaderProps = {
  collapsed: boolean
  logoSrc: string
  onToggleCollapse: () => void
}

export function BrandHeader({ collapsed, logoSrc, onToggleCollapse }: BrandHeaderProps) {
  return (
    <div className="h-[68px] px-3 border-b border-[#f0f1f4] flex items-center shrink-0">
      <div className="inline-flex items-center min-w-0 overflow-hidden">
        <img src={logoSrc} alt="ABI Logo" className="w-7 h-7 rounded-full shrink-0 shadow-[0_10px_24px_rgba(51,102,255,0.28)]" />
        <div 
          className={`flex items-center ml-3 overflow-hidden transition-all duration-300 ease-in-out ${
            collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'
          }`}
        >
          <Typography.Text 
            className="block whitespace-nowrap text-2xl font-semibold text-gray-900 leading-tight antialiased"
          >
            芯智
          </Typography.Text>
        </div>
      </div>
      <Button type="text" className="ml-auto text-[#6b7280]" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={onToggleCollapse} />
    </div>
  )
}

