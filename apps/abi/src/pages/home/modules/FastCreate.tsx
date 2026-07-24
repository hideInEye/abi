import s from '../index.module.scss'
import React from 'react'
import { useRouter } from '~/packages/simple-router/src'

const guideSteps = [
  {
    key: '1',
    title: '创建空间',
    description: '创建数据空间\n存储数据资产',
    colorClass: 's1',
    href: '/space-list',
    iconSvg: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  },
  {
    key: '2',
    title: '数据准备',
    description: '数据接入、数据\n共享、语义映射',
    colorClass: 's2',
    href: '/workbench/data-preparation/data-source',
    iconSvg: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
  },
  {
    key: '3',
    title: '本体网络',
    description: '构建业务语义地图，\n洞察赋能业务决策',
    colorClass: 's3',
    href: '/workbench/assistant-manage',
    iconSvg: '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  },
  {
    key: '4',
    title: '智能对话',
    description: '支持交互分析、\n自主智能洞察、报告生成',
    colorClass: 's4',
    href: '/ai-assistant/conversational-analysis',
    iconSvg: '<path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>',
  },
]

export const FastCreate: React.FC = () => {
  const { push } = useRouter()

  return (
    <div className={s['guide-flow']}>
      {guideSteps.map((step, index) => (
        <React.Fragment key={step.key}>
          <div className={s['guide-step']} onClick={() => push(step.href)}>
            <div className={s['guide-step-top']}>
              <div className={`${s['guide-circle']} ${s[step.colorClass]}`}>
                <span className={s['guide-num']}>{index + 1}</span>
                <svg viewBox="0 0 24 24" dangerouslySetInnerHTML={{ __html: step.iconSvg }} />
              </div>
              <div className={s['guide-text']}>
                <div className={s['guide-label']}>{step.title}</div>
                <div className={s['guide-desc']}>{step.description}</div>
              </div>
            </div>
          </div>
          {index !== guideSteps.length - 1 && (
            <div className={s['guide-arrow']}>
              <svg viewBox="0 0 40 12">
                <line x1="0" y1="6" x2="34" y2="6" />
                <polyline points="30 2 36 6 30 10" />
              </svg>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  )
}
