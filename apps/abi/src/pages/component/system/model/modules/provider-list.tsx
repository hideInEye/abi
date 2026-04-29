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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Tab 切换 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ATabs
          activeKey={activeTab}
          size="small"
          type="card"
          style={{ flex: 1 }}
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
      <div style={{ flex: 1, overflow: 'auto' }}>
        <ASpin spinning={loading}>
          {filteredProviders.length === 0 ? (
            <AEmpty description="暂无供应商" style={{ marginTop: 80 }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredProviders.map(item => (
                <div
                  key={item.providerId}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderRadius: 6,
                    transition: 'background-color 0.2s',
                    backgroundColor: activeProviderId === item.providerId ? 'rgba(22,119,255,0.1)' : 'transparent',
                  }}
                  onMouseEnter={e => {
                    if (activeProviderId !== item.providerId) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(22,119,255,0.05)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (activeProviderId !== item.providerId) {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'
                    }
                  }}
                  onClick={() => onSelect(item.providerId)}
                >
                  {item.iconUrl ? (
                    <img src={item.iconUrl} alt={item.providerName} style={{ width: 20, height: 20, objectFit: 'contain' }} />
                  ) : (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: 4,
                        background: '#e6f4ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        color: '#1677ff',
                        fontWeight: 'bold',
                        flexShrink: 0,
                      }}
                    >
                      {item.providerName?.slice(0, 1)}
                    </div>
                  )}
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {item.providerName}
                    </div>
                  </div>
                  {activeProviderId === item.providerId && (
                    <span style={{ color: '#1677ff', fontSize: 14 }}>›</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </ASpin>
      </div>
    </div>
  )
}

export default ProviderList
