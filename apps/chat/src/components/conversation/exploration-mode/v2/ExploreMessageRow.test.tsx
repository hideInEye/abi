import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import { createExploreReplay, createReplayItem } from '../exploreReplay.fixture'
import { reduceExploreEvent } from '../exploreStreamReducer'

import ExploreMessageRow from './ExploreMessageRow'
import ExploreProcess from './ExploreProcess'
import { buildProcessBlocks } from './displayModel'
import { isNearBottom } from './useExploreScroll'

const completed = () => createExploreReplay().reduce(reduceExploreEvent, createReplayItem())

describe('新版探索消息结构', () => {
  it('回答卡片包含状态、工作室、最终摘要及操作，问题气泡保持独立', () => {
    const item = completed()
    const markup = renderToStaticMarkup(<ExploreMessageRow item={item} onOpen={vi.fn()} />)
    const cardStart = markup.indexOf('<section')
    const card = markup.slice(cardStart, markup.lastIndexOf('</section>') + '</section>'.length)
    expect(card).toContain('aria-label="探索回答"')
    expect(card).toContain('<header')
    expect(card).toContain('探索分析')
    expect(card).toContain('aria-label="打开工作室"')
    expect(card).toContain('aria-label="最终摘要"')
    expect(card).toContain('<footer')
    expect(card).toContain('aria-label="点赞"')
    expect(card).toContain('aria-label="点踩"')
    expect(card).toContain('aria-label="保存为文档"')
    expect(markup.indexOf(item.question)).toBeLessThan(cardStart)
    expect(card).not.toContain(item.question)
  })

  it('运行过程与先到的摘要处于同一回答卡片且互不嵌套', () => {
    const markup = renderToStaticMarkup(<ExploreMessageRow item={{ ...createReplayItem(), finalContent: '先到的回答' }} />)
    const cardStart = markup.indexOf('aria-label="探索回答"')
    const processStart = markup.indexOf('aria-label="探索执行过程"')
    const summaryStart = markup.indexOf('aria-label="最终摘要"')
    expect(cardStart).toBeLessThan(processStart)
    expect(processStart).toBeLessThan(summaryStart)
    expect(markup.slice(processStart, summaryStart)).toContain('</div>')
    expect(summaryStart).toBeLessThan(markup.indexOf('<footer'))
  })

  it.each(['running', 'completed', 'failed', 'cancelled'] as const)('%s 状态保留独立徽标和过程切换的可访问名称', (status) => {
    const markup = renderToStaticMarkup(<ExploreMessageRow item={{ ...completed(), status }} />)
    expect(markup).toContain(`data-status="${status}"`)
    expect(markup).toMatch(/aria-label="探索(?:执行中|已完成|失败|已取消)" aria-expanded=/)
  })

  it('成功历史默认收起，但顶部工作室和最终摘要仍可见', () => {
    const markup = renderToStaticMarkup(<ExploreMessageRow item={completed()} onOpen={vi.fn()} />)
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).not.toContain('aria-label="探索执行过程"')
    expect(markup).toContain('aria-label="最终摘要"')
    expect(markup).toContain('关键依据')
    expect(markup).not.toContain('年度销售额 120000 元，订单量 80 单。')
    expect(markup.indexOf('aria-label="打开工作室"')).toBeLessThan(markup.indexOf('aria-label="最终摘要"'))
  })

  it('final 先到即可显示，过程仍保持运行展开', () => {
    const item = { ...createReplayItem(), finalContent: '先到的回答' }
    const markup = renderToStaticMarkup(<ExploreMessageRow item={item} />)
    expect(markup).toContain('aria-expanded="true"')
    expect(markup).toContain('aria-label="探索执行过程"')
    expect(markup).toContain('先到的回答')
    expect(markup).toContain('探索执行中')
  })

  it.each(['failed', 'cancelled'] as const)('%s 保持可见提示，不显示成功', (status) => {
    const markup = renderToStaticMarkup(<ExploreMessageRow item={{ ...completed(), status }} />)
    expect(markup).toContain('aria-label="探索执行过程"')
    expect(markup).not.toContain('探索已完成')
    expect(markup).toContain('已收到的内容已保留')
  })

  it('无执行结果时保存为文档入口禁用', () => {
    const markup = renderToStaticMarkup(<ExploreMessageRow item={createReplayItem()} />)
    expect(markup).toContain('aria-label="保存为文档" aria-haspopup="menu" disabled')
  })

  it('删除入口由回调控制，工作室激活时显示关闭入口', () => {
    const item = completed()
    expect(renderToStaticMarkup(<ExploreMessageRow item={item} />)).not.toContain('aria-label="删除"')
    const markup = renderToStaticMarkup(<ExploreMessageRow item={item} active onClose={vi.fn()} onDelete={vi.fn()} />)
    expect(markup).toContain('aria-label="删除"')
    expect(markup).toContain('aria-label="收起工作室"')
    expect(markup).toContain('aria-pressed="true"')
  })

  it('完整展开时无协议标记，保留工具标识与代码编辑，表格移交工作室', () => {
    const markup = renderToStaticMarkup(<ExploreProcess blocks={buildProcessBlocks(completed())}
      disclosure={{ isOpen: () => true, toggle: vi.fn(), reveal: vi.fn() }} onEditCode={vi.fn()} />)
    expect(markup).not.toContain('Previous Result Summary:')
    expect(markup).not.toContain('Summarizes Step ID:')
    expect(markup).toContain('execute_skill_script_file')
    expect(markup).toContain('执行脚本')
    expect(markup).toContain('编辑')
    expect(markup).toContain('复制代码')
    // 步骤内不再提供工作室入口，统一由卡片右上角进入。
    expect(markup).not.toContain('在工作室查看')
    expect(markup).not.toContain('<table')
  })

  it('只在贴底阈值内判定可自动跟随', () => {
    expect(isNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 550 })).toBe(true)
    expect(isNearBottom({ scrollHeight: 1000, clientHeight: 400, scrollTop: 100 })).toBe(false)
  })
})
