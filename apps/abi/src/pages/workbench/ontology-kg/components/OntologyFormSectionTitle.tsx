import { ProfileOutlined } from '@ant-design/icons'
import classNames from 'classnames'
import type { ReactNode } from 'react'

interface OntologyFormSectionTitleProps {
  readonly children: ReactNode
  readonly className?: string
  readonly icon?: ReactNode
}

export const OntologyFormSectionTitle = ({ children, className, icon }: OntologyFormSectionTitleProps) => (
  <div className={classNames('ds-form-section-title', className)}>
    {icon || <ProfileOutlined />}
    <span className="ds-form-section-title-text">{children}</span>
  </div>
)
