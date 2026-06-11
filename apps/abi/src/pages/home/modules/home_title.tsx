import { RightOutlined } from '@ant-design/icons'
import s from '../index.module.scss'

export const HomeTitle = ({ title, action, onAction }: { title: string; action?: React.ReactNode; onAction?: () => void }) => {
  return (
    <div className={s['section-title']}>
      <div className={s['section-title-bar']}></div>
      <span>{title}</span>
      {action && (
        <div className={s['section-title-action']} onClick={onAction}>
          {action}
          <RightOutlined style={{ fontSize: '0.625rem' }} />
        </div>
      )}
    </div>
  )
}
