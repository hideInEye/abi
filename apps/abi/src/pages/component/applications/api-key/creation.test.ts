import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

import dayjs from 'dayjs'
import ts from 'typescript'
import { describe, expect, it, vi } from 'vitest'

import { isFlatRequestSuccess } from '../../../../service/request/flat-result'

const drawerSource = readFileSync(new URL('./components/ApiKeyDrawer.tsx', import.meta.url), 'utf8')
const pageSource = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8')

function parse(source: string) {
  return ts.createSourceFile('component.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}

function findNodes<T extends ts.Node>(root: ts.Node, predicate: (node: ts.Node) => node is T): T[] {
  const matches: T[] = []
  const visit = (node: ts.Node) => {
    if (predicate(node)) matches.push(node)
    ts.forEachChild(node, visit)
  }
  visit(root)
  return matches
}

function evaluate(expression: string, context: Record<string, unknown> = {}) {
  const script = ts.transpileModule(`const result = ${expression}`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText
  return runInNewContext(`${script}; result`, context)
}

function getCallback(source: string, name: string, context: Record<string, unknown>) {
  const file = parse(source)
  const declaration = findNodes(file, ts.isVariableDeclaration).find(node => node.name.getText(file) === name)
  expect(declaration?.initializer).toBeDefined()
  return evaluate(declaration!.initializer!.getText(file), context) as (...args: unknown[]) => Promise<void>
}

function getAttribute(element: ts.JsxOpeningElement, name: string) {
  return element.attributes.properties.find(
    (attribute): attribute is ts.JsxAttribute => ts.isJsxAttribute(attribute) && attribute.name.getText() === name,
  )
}

const drawerFile = parse(drawerSource)
const formItems = findNodes(drawerFile, ts.isJsxElement).filter(node => node.openingElement.tagName.getText() === 'AForm.Item')

function getItem(name: string) {
  return formItems.find(node => getAttribute(node.openingElement, 'name')?.initializer?.getText() === `"${name}"`)
}

function getRules(name: string) {
  const attribute = getAttribute(getItem(name)!.openingElement, 'rules')
  const initializer = attribute!.initializer as ts.JsxExpression
  return evaluate(initializer.expression!.getText()) as Array<{ required?: boolean; pattern?: RegExp }>
}

const validValues = {
  activeTimeout: 600,
  description: '接口调用',
  expireTime: null,
  ipAccessType: 'unlimited',
  name: '测试_API123',
  spaceId: 10,
}

function createSubmit() {
  const context = {
    DEFAULT_ACTIVE_TIMEOUT: 1800,
    addAbiClient: vi.fn().mockResolvedValue({ error: null }),
    closeDrawer: vi.fn(),
    dayjs,
    extractSecretKey: vi.fn().mockReturnValue('test-secret'),
    isFlatRequestSuccess,
    message: { success: vi.fn() },
    refreshList: vi.fn(),
    setSubmitLoading: vi.fn(),
    showOneTimeSecretKeyModal: vi.fn(),
  }
  return { ...context, submit: getCallback(pageSource, 'handleSubmit', context) }
}

describe('APIKEY creation form', () => {
  it('registers every editable field and the whitelist condition inside the same form', () => {
    for (const name of ['name', 'spaceId', 'description', 'ipAccessType', 'activeTimeout', 'expireTime']) {
      expect(getItem(name), name).toBeDefined()
    }
    const owners = formItems.map(item => {
      let parent: ts.Node | undefined = item.parent
      while (parent) {
        if (ts.isJsxElement(parent) && parent.openingElement.tagName.getText() === 'AForm') return parent
        parent = parent.parent
      }
      return undefined
    })
    expect(owners.every(Boolean)).toBe(true)
    expect(new Set(owners).size).toBe(1)
  })

  it('initializes the IP restriction to unlimited and keeps both radio options selectable', () => {
    const form = findNodes(drawerFile, ts.isJsxElement).find(node => node.openingElement.tagName.getText() === 'AForm')!
    const initialValues = getAttribute(form.openingElement, 'initialValues')?.initializer as ts.JsxExpression
    expect(initialValues?.expression).toBeDefined()
    expect(evaluate(initialValues.expression!.getText()).ipAccessType).toBe('unlimited')
    const radios = findNodes(getItem('ipAccessType')!, ts.isJsxOpeningElement).filter(node => node.tagName.getText() === 'ARadio')
    expect(radios.map(node => getAttribute(node, 'value')?.initializer?.getText())).toEqual(['"unlimited"', '"whitelist"'])
    expect(radios.every(node => !getAttribute(node, 'disabled'))).toBe(true)
  })

  it('requires a name and only accepts Chinese, English, numbers and underscores', () => {
    expect(getItem('name')).toBeDefined()
    const rules = getRules('name')
    expect(rules.some(rule => rule.required)).toBe(true)
    const pattern = rules.find(rule => rule.pattern)?.pattern
    expect(pattern).toBeDefined()
    for (const value of ['名称', 'APIKey', '123', '_', '中文_API123']) expect(pattern!.test(value), value).toBe(true)
    for (const value of ['', ' ', 'a b', 'a-b', 'a.b', '测试!', '😀', ' API', 'API\n']) expect(pattern!.test(value), value).toBe(false)
  })

  it('waits for field validation, blocks an empty whitelist, and passes the selected IPs on success', async () => {
    const validateFields = vi.fn().mockResolvedValue({ ...validValues, ipAccessType: 'whitelist' })
    const context = { dayjs, form: { validateFields }, ipWhitelist: [] as string[], message: { error: vi.fn() }, onSubmit: vi.fn() }
    const finish = getCallback(drawerSource, 'handleFinish', context)
    await finish()
    expect(context.message.error).toHaveBeenCalledWith('请输入至少一个 IP 或 CIDR 网段')
    expect(context.onSubmit).not.toHaveBeenCalled()
    context.ipWhitelist.push('192.168.1.0/24')
    await finish()
    expect(context.onSubmit).toHaveBeenCalledWith({ ...validValues, ipAccessType: 'whitelist' }, ['192.168.1.0/24'])
    context.onSubmit.mockClear()
    validateFields.mockRejectedValueOnce(new Error('invalid form'))
    await expect(finish()).rejects.toThrow('invalid form')
    expect(context.onSubmit).not.toHaveBeenCalled()
  })

  it('omits the whitelist when switching back to unlimited and formats the expiry time', async () => {
    const context = {
      dayjs,
      form: { validateFields: vi.fn().mockResolvedValue({ ...validValues, expireTime: dayjs('2026-12-31 12:30:00') }) },
      ipWhitelist: ['192.168.1.10'],
      message: { error: vi.fn() },
      onSubmit: vi.fn(),
    }
    await getCallback(drawerSource, 'handleFinish', context)()
    expect(context.onSubmit).toHaveBeenCalledWith({ ...validValues, expireTime: '2026-12-31 12:30:00' }, [])
  })
})

// Modified API call coverage: index.tsx -> handleSubmit -> addAbiClient.
describe('APIKEY creation request', () => {
  it.each(['unlimited', 'whitelist'])('submits name and preserves the %s access contract', async ipAccessType => {
    const context = createSubmit()
    await context.submit({ ...validValues, ipAccessType }, ['192.168.1.10'])
    expect(context.addAbiClient).toHaveBeenCalledWith({
      activeTimeout: 600,
      expireTime: null,
      ips: ipAccessType === 'whitelist' ? [{ whitelist: '192.168.1.10' }] : undefined,
      name: '测试_API123',
      remark: '接口调用',
      restrictedIp: ipAccessType === 'whitelist' ? 1 : 0,
      spaceId: 10,
    })
  })

  it('waits for explicit success before closing, displaying credentials or refreshing', async () => {
    const context = createSubmit()
    let resolve!: (result: { error: null }) => void
    context.addAbiClient.mockReturnValueOnce(new Promise(done => { resolve = done }))
    const pending = context.submit(validValues, [])
    expect(context.closeDrawer).not.toHaveBeenCalled()
    expect(context.message.success).not.toHaveBeenCalled()
    expect(context.refreshList).not.toHaveBeenCalled()
    expect(context.showOneTimeSecretKeyModal).not.toHaveBeenCalled()
    resolve({ error: null })
    await pending
    expect(context.closeDrawer).toHaveBeenCalledOnce()
    expect(context.message.success).toHaveBeenCalledOnce()
    expect(context.showOneTimeSecretKeyModal).toHaveBeenCalledOnce()
    expect(context.refreshList).toHaveBeenCalledWith(1)
    expect(context.setSubmitLoading).toHaveBeenLastCalledWith(false)
  })

  it.each([{ error: new Error('backend failure') }, {}, null])('does not continue the success flow after result %s', async result => {
    const context = createSubmit()
    context.addAbiClient.mockResolvedValueOnce(result)
    await context.submit(validValues, [])
    expect(context.closeDrawer).not.toHaveBeenCalled()
    expect(context.message.success).not.toHaveBeenCalled()
    expect(context.extractSecretKey).not.toHaveBeenCalled()
    expect(context.showOneTimeSecretKeyModal).not.toHaveBeenCalled()
    expect(context.refreshList).not.toHaveBeenCalled()
    expect(context.setSubmitLoading).toHaveBeenLastCalledWith(false)
  })

  it('keeps the drawer and resets loading if the request rejects', async () => {
    const context = createSubmit()
    context.addAbiClient.mockRejectedValueOnce(new Error('network failure'))
    await expect(context.submit(validValues, [])).rejects.toThrow('network failure')
    expect(context.closeDrawer).not.toHaveBeenCalled()
    expect(context.message.success).not.toHaveBeenCalled()
    expect(context.showOneTimeSecretKeyModal).not.toHaveBeenCalled()
    expect(context.refreshList).not.toHaveBeenCalled()
    expect(context.setSubmitLoading).toHaveBeenLastCalledWith(false)
  })
})
