import React from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  title = '开始新的对话',
  description = '输入您的问题，我将为您提供专业的分析和解答',
}) => {
  return (
    <div className="flex flex-col items-center justify-center h-full px-8">
      {/* Illustration */}
      <div className="mb-8 relative">
        <div
          style={{
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(91,124,247,0.08), rgba(139,92,246,0.08))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {/* Floating decorative circles */}
          <div
            style={{
              position: 'absolute',
              top: 20,
              right: 10,
              width: 40,
              height: 40,
              borderRadius: '50%',
              background: 'rgba(91, 124, 247, 0.15)',
              animation: 'float 3s ease-in-out infinite',
            }}
          />
          <div
            style={{
              position: 'absolute',
              bottom: 30,
              left: 15,
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: 'rgba(139, 92, 246, 0.15)',
              animation: 'float 3s ease-in-out infinite 1s',
            }}
          />

          {/* Central icon */}
          <svg
            width="80"
            height="80"
            viewBox="0 0 80 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Chat bubble */}
            <path
              d="M20 25C20 21.134 23.134 18 27 18H53C56.866 18 60 21.134 60 25V45C60 48.866 56.866 52 53 52H33L25 60V52H27C23.134 52 20 48.866 20 45V25Z"
              fill="url(#chatGradient)"
              opacity="0.9"
            />
            {/* Sparkles */}
            <circle cx="35" cy="35" r="3" fill="#5b7cf7" />
            <circle cx="45" cy="35" r="3" fill="#8b5cf6" />
            <circle cx="40" cy="42" r="2.5" fill="#5b7cf7" opacity="0.7" />

            <defs>
              <linearGradient id="chatGradient" x1="20" y1="18" x2="60" y2="60">
                <stop offset="0%" stopColor="#5b7cf7" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Title */}
      <h2
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: 'var(--ink)',
          marginBottom: 12,
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}
      >
        {title}
      </h2>

      {/* Description */}
      <p
        style={{
          fontSize: 15,
          color: 'var(--ink-3)',
          lineHeight: 1.6,
          textAlign: 'center',
          maxWidth: 400,
          margin: '0 auto',
        }}
      >
        {description}
      </p>

      {/* Quick action hints */}
      <div className="mt-10 flex flex-wrap gap-3 justify-center max-w-2xl">
        <div
          className="px-4 py-2 rounded-lg"
          style={{
            background: 'rgba(91, 124, 247, 0.08)',
            border: '1px solid rgba(91, 124, 247, 0.15)',
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          💡 试试问：帮我分析一下...
        </div>
        <div
          className="px-4 py-2 rounded-lg"
          style={{
            background: 'rgba(139, 92, 246, 0.08)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          📊 查询数据趋势
        </div>
        <div
          className="px-4 py-2 rounded-lg"
          style={{
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.15)',
            fontSize: 13,
            color: 'var(--ink-2)',
          }}
        >
          🎯 生成分析报告
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  )
}

export default EmptyState
