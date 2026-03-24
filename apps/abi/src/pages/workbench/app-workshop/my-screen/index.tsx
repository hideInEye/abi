import PageTitle from '@/components/stateless/common/PageTitle';

interface ScreenItem {
  id: string;
  name: string;
  cover?: string;
}

export function Component() {
  const dataSource: ScreenItem[] = [];

  return (
    <div className="flex flex-col gap-2 p-6" style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
      <PageTitle />
      <div className="flex items-center gap-4">
        <AInput
          placeholder="请输入大屏名称"
          style={{ width: '12.5rem' }}
        />
      </div>
      {dataSource.length === 0 ? (
        <div
          style={{
            border: '0.0625rem solid #d9d9d9',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            width: '100%',
            height: '12.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AEmpty description="暂无数据" />
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '1.25rem',
            alignContent: 'flex-start',
            overflowY: 'auto',
            flex: 1,
            padding: '0.25rem',
          }}
        >
          {dataSource.map(item => (
            <div
              key={item.id}
              style={{
                flex: '1 1 calc(25% - 1.25rem)',
                maxWidth: 'calc(25% - 1.25rem)',
                backgroundColor: '#ffffff',
                border: '1px solid #e8e8e8',
                borderRadius: '0.5rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              <div
                style={{
                  margin: '0.75rem 0.75rem 0',
                  aspectRatio: '16/9',
                  backgroundImage: item.cover ? `url(${item.cover})` : undefined,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '0.25rem',
                }}
              />
              <div
                style={{
                  padding: '0.75rem',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#555555',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {item.name}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
