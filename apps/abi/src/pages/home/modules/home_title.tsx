import s from '../index.module.scss'

export const HomeTitle = ({ title, action, onAction, className }: { title: string; action?: React.ReactNode; onAction?: () => void; className?: string }) => {
  return (
    <div className={`${s['section-title']}${className ? ` ${className}` : ''}`}>
      <div className={s['section-title-bar']}></div>
      <span>{title}</span>
      {action && (
        <div className={s['section-title-action']} onClick={onAction}>
          {action}
          <svg viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}
    </div>
  )
}
