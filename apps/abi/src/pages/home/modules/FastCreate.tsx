import type { ISpaceItem } from '@/pages/space-list/types'
import { useRouter } from '~/packages/simple-router/src'
import { Typography } from 'antd'
const { Title, Text } = Typography

import stepOneIcon from '@/assets/imgs/home/step_one.png'
import stepTwoIcon from '@/assets/imgs/home/step_two.png'
import stepThreeIcon from '@/assets/imgs/home/step_three.png'
import stepFourIcon from '@/assets/imgs/home/step_four.png'
import s from '../index.module.scss'
import React from 'react'
import { persistSpaceId, persistSpaceName } from '@/utils/spaceStorage'
/**
 * 快速创建组件
 * 提供系统主要功能的快速访问入口
 * 按照数据处理流程顺序展示创建选项：
 * 1. 我的空间 - 创建数据空间来储存数据资产
 * 2. 数据对接 - 连接各类数据源
 * 3. 数据关联 - 创建数据集并进行数据关联
 * 4. 表语义关联 - 建立表之间的语义关系
 * 5. 智能对话 - 基于数据进行AI对话分析
 * 自动设置默认空间ID，确保用户操作的连续性
 */

interface FastCreateProps {
  readonly spaceList: ISpaceItem[]
}
// FastCreate.tsx（方案 2：独立 Connector 节点）
export const FastCreate: React.FC<FastCreateProps> = ({ spaceList }) => {
  const { push } = useRouter()

  function handleCreate(url: string) {
    const spaceId = localStorage.getItem('spaceId')
    if (!spaceId && spaceList?.length > 0) {
      persistSpaceId(spaceList[0]?.spaceId)
      persistSpaceName(spaceList[0]?.spaceName)
    }
    push(url)
  }

  const guideSteps = [
    { key: '1', title: '创建空间', description: '创建数据空间\n存储数据资产', icon: stepOneIcon },
    { key: '2', title: '数据准备', description: '数据接入、数据\n共享、语义映射', icon: stepTwoIcon },
    { key: '3', title: '助手配置', description: '让每个人拥有个性化\n数据分析助手', icon: stepThreeIcon },
    { key: '4', title: '智能对话', description: '通过可视化组件\n进行交互式分析', icon: stepFourIcon },
  ]

  return (
    <div className={s['fast-create']}>
      <div className={s['fast-create__grid']}>
        {guideSteps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className={s['fast-create__step']}>
              <div className={s['fast-create__head']}>
                <div className={s['fast-create__iconWrap']}>
                  <img src={step.icon} alt={step.title} className={s['fast-create__icon']} />
                </div>
              </div>
              <div className="flex flex-col gap-[0.9375rem]">
                <Title level={5} className={s['fast-create__title']}>
                  {`${index + 1}. ${step.title}`}
                </Title>
                <Text className={s['fast-create__desc']}>{step.description}</Text>
              </div>
            </div>

            {index !== guideSteps.length - 1 && (
              <div className={s['fast-create__connector']}>
                <span className={s['fast-create__line']} />
                <span className={s['fast-create__arrow']} />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
