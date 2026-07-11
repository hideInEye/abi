import type { FC } from 'react'
import s from '../../home/index.module.scss'

interface ApprovSpaceProps {
  readonly onClick?: () => void
}

export const ApprovSpace: FC<ApprovSpaceProps> = ({ onClick }) => {
  return (
    <div className={`${s['space-card']} ${s['add-card']}`} onClick={onClick}>
      <div className={s['add-card-body']}>
        <div className={s['add-icon-ring']}>
          <svg viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </div>
        <div className={s['add-label']}>创建新空间</div>
        <div className={s['add-sublabel']}>开启新的协作环境</div>
      </div>
    </div>
  )
}
