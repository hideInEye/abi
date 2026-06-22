import { AppstoreOutlined, CloudOutlined, LaptopOutlined } from '@ant-design/icons'

interface ProviderItem {
  providerId: number
  providerName: string
  providerKey: string
  providerType: string  // '1' = 公有, '2' = 本地
  iconUrl?: string
}

interface Props {
  providers: ProviderItem[]
  loading?: boolean
  activeProviderId: number | null
  activeTab: '0' | '1' | '2'
  onSelect: (id: number | null) => void
  onTabChange: (tab: '0' | '1' | '2') => void
}

const tabItems = [
  { key: '0', label: '全部', icon: <AppstoreOutlined /> },
  { key: '1', label: '公有', icon: <CloudOutlined /> },
  { key: '2', label: '本地', icon: <LaptopOutlined /> },
]

const ProviderList: FC<Props> = ({ providers, loading, activeProviderId, activeTab, onSelect, onTabChange }) => {
  const filteredProviders = activeTab === '0'
    ? providers
    : providers.filter(p => p.providerType === activeTab)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 面板标题 */}
      <div style={{
        padding: '16px 16px 12px',
        fontSize: 14,
        fontWeight: 700,
        color: '#1a2744',
        letterSpacing: '0.02em',
        borderBottom: '1px solid rgba(130, 140, 200, 0.08)',
      }}>
        供应商
      </div>

      {/* Tab 切换 */}
      <div style={{ padding: '8px 12px 0' }}>
        <ATabs
          activeKey={activeTab}
          size="small"
          onChange={(key) => onTabChange(key as '0' | '1' | '2')}
          items={tabItems.map(t => ({
            key: t.key,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {t.icon}
                {t.label}
              </span>
            ),
          }))}
        />
      </div>

      {/* 供应商列表 */}
      <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px 8px' }}>
        <ASpin spinning={loading}>
          {filteredProviders.length === 0 ? (
            <AEmpty description="暂无供应商" style={{ marginTop: 60 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* 全部供应商选项 */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  borderRadius: 8,
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  backgroundColor: activeProviderId === null ? 'rgba(91, 124, 247, 0.10)' : 'transparent',
                  color: activeProviderId === null ? '#5b7cf7' : '#3e5068',
                  fontWeight: activeProviderId === null ? 600 : 500,
                  fontSize: 14,
                }}
                onMouseEnter={e => {
                  if (activeProviderId !== null) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(91, 124, 247, 0.06)'
                  }
                }}
                onMouseLeave={e => {
                  if (activeProviderId !== null) {
                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                  }
                }}
                onClick={() => onSelect(null)}
              >
                <AppstoreOutlined style={{ fontSize: 16 }} />
                <span style={{ flex: 1 }}>全部</span>
                <span style={{ fontSize: 12, color: '#768a9f' }}>{providers.length}</span>
              </div>

              {filteredProviders.map(item => {
                const isActive = activeProviderId === item.providerId
                return (
                  <div
                    key={item.providerId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                      borderRadius: 8,
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      backgroundColor: isActive ? 'rgba(91, 124, 247, 0.10)' : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(91, 124, 247, 0.06)'
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                      }
                    }}
                    onClick={() => onSelect(item.providerId)}
                  >
                    {item.iconUrl ? (
                      <img src={item.iconUrl} alt={item.providerName} style={{ width: 20, height: 20, objectFit: 'contain', flexShrink: 0 }} />
                    ) : (
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          background: isActive ? 'linear-gradient(135deg, #5b7cf7, #7091fa)' : 'rgba(91, 124, 247, 0.10)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          color: isActive ? '#fff' : '#5b7cf7',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {item.providerName?.slice(0, 1)}
                      </div>
                    )}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: isActive ? 600 : 500,
                          color: isActive ? '#5b7cf7' : '#3e5068',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.providerName}
                      </div>
                    </div>
                    {isActive && (
                      <span style={{ color: '#5b7cf7', fontSize: 16, lineHeight: 1 }}>›</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ASpin>
      </div>
    </div>
  )
}

export default ProviderList
