import type { FC } from 'react'
import s from '../../home/index.module.scss'

export const ApprovSpace: FC = () => {
  return (
    <div className={s['space-card']} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '8rem' }}>
      <div style={{ textAlign: 'center', color: 'var(--v5-ink-3)', fontSize: '0.875rem' }}>
        <div style={{
          width: '3rem',
          height: '3rem',
          borderRadius: '50%',
          background: 'var(--v5-accent-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 0.75rem',
        }}>
          <svg viewBox="0 0 24 24" style={{ width: '1.5rem', height: '1.5rem', stroke: 'var(--v5-accent)', fill: 'none', strokeWidth: 2, strokeLinecap: 'round' }}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div style={{ fontWeight: 600, color: 'var(--v5-ink-2)' }}>创建应用</div>
      </div>
    </div>
  )
}
