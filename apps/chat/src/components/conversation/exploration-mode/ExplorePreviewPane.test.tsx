import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import ExplorePreviewPane, { buildPreviewScreens } from './ExplorePreviewPane'
import { createExploreReplay, createReplayItem } from './exploreReplay.fixture'
import { reduceExploreEvent } from './exploreStreamReducer'

const completed = () => createExploreReplay().reduce(reduceExploreEvent, createReplayItem())

describe('工作室分屏与步骤工具栏', () => {
  it('每个结构化步骤各一屏，最终结论与摘要合并为末屏', () => {
    const screens = buildPreviewScreens(completed())
    expect(screens).toHaveLength(2)
    expect(screens[0]).toMatchObject({ kind: 'step', stepId: 'step-2' })
    expect(screens[1]).toMatchObject({ kind: 'final', title: '最终结论' })
  })

  it('无结构化步骤但有最终结论时只剩末屏，纯空项无任何屏', () => {
    expect(buildPreviewScreens({ ...createReplayItem(), finalContent: '结论' })).toEqual([
      { key: 'final', kind: 'final', title: '最终结论' },
    ])
    expect(buildPreviewScreens(createReplayItem())).toEqual([])
  })

  it('未定位步骤时默认停在最新屏：指示器 2 / 2，下一步禁用并展示最终结论', () => {
    const markup = renderToStaticMarkup(<ExplorePreviewPane item={completed()} onClose={vi.fn()} />)
    expect(markup).toContain('2 / 2')
    expect(markup).toContain('aria-label="上一步"')
    expect(markup).toContain('aria-label="下一步" disabled')
    expect(markup).toContain('最终结论')
    expect(markup).toContain('年度销售额 120000 元，订单量 80 单。')
  })

  it('定位到步骤屏：指示器 1 / 2，上一步禁用并展示该步骤的表格数据', () => {
    const markup = renderToStaticMarkup(<ExplorePreviewPane item={completed()} onClose={vi.fn()} activeStepId="step-2" />)
    expect(markup).toContain('1 / 2')
    expect(markup).toContain('aria-label="上一步" disabled')
    expect(markup).toContain('120000')
  })

  it('运行中且不在末屏时提供跳到最新入口', () => {
    const markup = renderToStaticMarkup(
      <ExplorePreviewPane item={{ ...completed(), status: 'running' }} onClose={vi.fn()} activeStepId="step-2" />,
    )
    expect(markup).toContain('跳到最新')
  })

  it('无任何结果屏时不渲染工具栏，仅展示空状态', () => {
    const markup = renderToStaticMarkup(<ExplorePreviewPane item={createReplayItem()} onClose={vi.fn()} />)
    expect(markup).not.toContain('aria-label="上一步"')
    expect(markup).toContain('暂无执行结果')
  })

  it('步骤条按屏数等分并标记当前屏，供点击定位', () => {
    const markup = renderToStaticMarkup(<ExplorePreviewPane item={completed()} onClose={vi.fn()} activeStepId="step-2" />)
    expect(markup).toContain('aria-label="结果步骤进度"')
    expect((markup.match(/aria-label="第 \d+ 屏/g) || []).length).toBe(2)
    expect(markup).toContain('aria-current="step"')
  })
})
