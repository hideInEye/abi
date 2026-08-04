type BrandHeaderProps = {
  collapsed: boolean
  logoSrc: string
}

export function BrandHeader({ collapsed, logoSrc }: BrandHeaderProps) {
  return (
    <div className="px-4 pt-5 pb-4 flex items-center shrink-0" style={{ gap: 18 }}>
      {/* Logo - larger and more prominent */}
      <img
        src={logoSrc}
        alt="ABI Logo"
        className="shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          boxShadow: '0 8px 24px rgba(51,102,255,0.35)',
        }}
      />

      {/* Brand Text */}
      <div
        className="overflow-hidden transition-all duration-300 ease-in-out"
        style={{
          width: collapsed ? 0 : 'auto',
          opacity: collapsed ? 0 : 1,
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '-0.01em',
            whiteSpace: 'nowrap',
            lineHeight: 1.3,
          }}
        >
          芯智
          <span
            style={{
              display: 'block',
              fontSize: 10,
              fontWeight: 500,
              color: 'var(--ink-4)',
              marginTop: 2,
            }}
          >
            TrustABI
          </span>
        </div>
      </div>
    </div>
  )
}
