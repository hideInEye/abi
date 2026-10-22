import { beforeEach, describe, expect, it, vi } from 'vitest'

import { OntologyMetadataActions } from './OntologyMetadataActions'

const state = vi.hoisted(() => ({ open: false, setOpen: vi.fn() }))
vi.mock('react', async original => ({
  ...await original<typeof import('react')>(),
  useState: () => [state.open, state.setOpen],
}))
vi.mock('antd', () => ({ Button: 'button', Dropdown: 'dropdown', Popconfirm: 'popconfirm' }))
vi.mock('@ant-design/icons', () => ({ ApartmentOutlined: 'apartment', DeleteOutlined: 'delete', DownOutlined: 'down', MoreOutlined: 'more' }))

function render(overrides: Partial<Parameters<typeof OntologyMetadataActions>[0]> = {}) {
  const onAnalysis = vi.fn()
  const onDelete = vi.fn().mockResolvedValue(undefined)
  const props = { deleteDescription: '确定删除该指标吗？', onAnalysis, onDelete, ...overrides }
  const confirm = OntologyMetadataActions(props)
  const dropdown = confirm.props.children
  return { confirm, dropdown, props }
}

beforeEach(() => { vi.clearAllMocks(); state.open = false })

describe('本体网络更多操作', () => {
  it('列表显示更多按钮，元数据分析与删除在菜单中', () => {
    const { dropdown, props } = render()
    expect(dropdown.props.trigger).toEqual(['click'])
    expect(dropdown.props.children.props.children[0]).toBe('更多 ')
    expect(dropdown.props.menu.items.filter((item: any) => item.key).map((item: any) => item.key)).toEqual(['metadata', 'delete'])
    dropdown.props.menu.items[0].onClick()
    expect(props.onAnalysis).toHaveBeenCalledOnce()
    expect(props.onDelete).not.toHaveBeenCalled()
  })

  it('卡片复用靠右三点按钮，无可见文字，点击不冒泡到卡片', () => {
    const { dropdown } = render({ viewMode: 'card' })
    const button = dropdown.props.children
    expect(button.props.className).toBe('abi-card-more')
    expect(button.props.children.type).toBe('more')
    expect(button.props['aria-label']).toBe('更多操作')
    const stopPropagation = vi.fn()
    button.props.onClick({ stopPropagation })
    expect(stopPropagation).toHaveBeenCalledOnce()
  })

  it('选择删除只打开确认，取消不调用删除接口', () => {
    const { confirm, dropdown, props } = render()
    dropdown.props.menu.items.at(-1).onClick()
    expect(state.setOpen).toHaveBeenCalledWith(true)
    expect(props.onDelete).not.toHaveBeenCalled()
    confirm.props.onCancel()
    expect(state.setOpen).toHaveBeenLastCalledWith(false)
    expect(props.onDelete).not.toHaveBeenCalled()
  })

  it('删除成功后才关闭确认', async () => {
    let resolve!: () => void
    const onDelete = vi.fn(() => new Promise<void>(done => { resolve = done }))
    const { confirm } = render({ onDelete })
    const pending = confirm.props.onConfirm()
    expect(onDelete).toHaveBeenCalledOnce()
    expect(state.setOpen).not.toHaveBeenCalled()
    resolve()
    await pending
    expect(state.setOpen).toHaveBeenCalledWith(false)
  })

  it('删除失败保持确认状态', async () => {
    const { confirm } = render({ onDelete: vi.fn().mockRejectedValue(new Error('删除失败')) })
    await expect(confirm.props.onConfirm()).rejects.toThrow('删除失败')
    expect(state.setOpen).not.toHaveBeenCalled()
  })

  it('保留既有配置项以及实体删除中的禁用状态', () => {
    const extra = { key: 'attributes', label: '属性配置', onClick: vi.fn() }
    const { dropdown, confirm } = render({ extraItems: [extra], deleting: true, deleteTitle: '删除确认' })
    expect(dropdown.props.menu.items[1]).toBe(extra)
    expect(dropdown.props.menu.items.at(-1).disabled).toBe(true)
    expect(dropdown.props.children.props.loading).toBe(true)
    expect(confirm.props.title).toBe('删除确认')
    expect(confirm.props.trigger).toEqual([])
  })
})
