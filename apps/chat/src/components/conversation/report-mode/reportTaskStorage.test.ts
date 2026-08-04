import { describe, expect, it } from 'vitest'

import {
  createReportTaskStorage,
  getReportTaskSortOrder,
  normalizeReportTaskRecord,
} from './reportTaskStorage'
import type { ReportTaskRecord } from './types'

interface MemoryDatabaseState {
  records: Map<string, ReportTaskRecord>
  storeCreated: boolean
  indexCreated: boolean
}

interface MemoryRange {
  lower: [string, number]
  upper: [string, number]
}

function compoundKey(conversationId: string, taskId: string): string {
  return JSON.stringify([conversationId, taskId])
}

function cloneRecord(record: ReportTaskRecord): ReportTaskRecord {
  return { ...record }
}

function createMemoryIndexedDB(): { indexedDBFactory: IDBFactory; keyRangeFactory: { bound: (lower: IDBValidKey, upper: IDBValidKey) => IDBKeyRange } } {
  const databases = new Map<string, MemoryDatabaseState>()

  function createRequest<T>(transaction: IDBTransaction | undefined, operation: () => T): IDBRequest<T> {
    const request = {
      result: undefined as T,
      error: null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
    }

    queueMicrotask(() => {
      try {
        request.result = operation()
        request.onsuccess?.(new Event('success'))
        if (transaction) queueMicrotask(() => transaction.oncomplete?.(new Event('complete')))
      } catch (error) {
        Object.assign(request, { error })
        request.onerror?.(new Event('error'))
        if (transaction) transaction.onerror?.(new Event('error'))
      }
    })

    return request as unknown as IDBRequest<T>
  }

  function createDatabase(state: MemoryDatabaseState): IDBDatabase {
    const createStore = (transaction?: IDBTransaction): IDBObjectStore => {
      const store = {
        indexNames: {
          contains: (name: string) => name === 'byConversationCreatedAt' && state.indexCreated,
        },
        createIndex: (name: string) => {
          if (name === 'byConversationCreatedAt') state.indexCreated = true
          return {} as IDBIndex
        },
        put: (value: ReportTaskRecord) =>
          createRequest(transaction, () => {
            state.records.set(compoundKey(value.conversationId, value.taskId), cloneRecord(value))
            return [value.conversationId, value.taskId] as IDBValidKey
          }),
        delete: (key: IDBValidKey) =>
          createRequest(transaction, () => {
            const [conversationId, taskId] = key as [string, string]
            state.records.delete(compoundKey(conversationId, taskId))
            return undefined
          }),
        clear: () =>
          createRequest(transaction, () => {
            state.records.clear()
            return undefined
          }),
        index: () => ({
          getAll: (range: IDBKeyRange) =>
            createRequest(transaction, () => {
              const { lower, upper } = range as unknown as MemoryRange
              return [...state.records.values()]
                .filter((record) => record.conversationId === lower[0] && record.createdAt >= lower[1] && record.createdAt <= upper[1])
                .sort((left, right) => left.createdAt - right.createdAt)
                .map(cloneRecord)
            }),
        }),
      }

      return store as unknown as IDBObjectStore
    }

    const database = {
      objectStoreNames: {
        contains: (name: string) => name === 'reportTasks' && state.storeCreated,
      },
      createObjectStore: (_name: string, options?: IDBObjectStoreParameters) => {
        expect(options?.keyPath).toEqual(['conversationId', 'taskId'])
        state.storeCreated = true
        return createStore()
      },
      transaction: () => {
        const transaction = {
          error: null,
          oncomplete: null as ((event: Event) => void) | null,
          onerror: null as ((event: Event) => void) | null,
          onabort: null as ((event: Event) => void) | null,
          objectStore: () => createStore(transaction as unknown as IDBTransaction),
        }
        return transaction as unknown as IDBTransaction
      },
      close: () => undefined,
      onversionchange: null,
    }

    return database as unknown as IDBDatabase
  }

  const indexedDBFactory = {
    open: (name: string) => {
      const isNew = !databases.has(name)
      const state = databases.get(name) || {
        records: new Map<string, ReportTaskRecord>(),
        storeCreated: false,
        indexCreated: false,
      }
      databases.set(name, state)
      const database = createDatabase(state)
      const request = {
        result: database,
        error: null,
        transaction: undefined as IDBTransaction | undefined,
        onupgradeneeded: null as ((event: IDBVersionChangeEvent) => void) | null,
        onsuccess: null as ((event: Event) => void) | null,
        onerror: null as ((event: Event) => void) | null,
        onblocked: null as ((event: Event) => void) | null,
      }

      queueMicrotask(() => {
        if (isNew) request.onupgradeneeded?.(new Event('upgradeneeded') as IDBVersionChangeEvent)
        request.onsuccess?.(new Event('success'))
      })

      return request as unknown as IDBOpenDBRequest
    },
  } as unknown as IDBFactory

  const keyRangeFactory = {
    bound: (lower: IDBValidKey, upper: IDBValidKey) => ({ lower, upper }) as unknown as IDBKeyRange,
  }

  return { indexedDBFactory, keyRangeFactory }
}

function task(overrides: Partial<ReportTaskRecord> = {}): ReportTaskRecord {
  return {
    conversationId: 'conv-1',
    sessionId: 'session-1',
    taskId: 'task-1',
    question: '生成销售报告',
    streamKey: 'report:conv-1:1',
    sortOrder: 1,
    createdAt: 100,
    ...overrides,
  }
}

describe('reportTaskStorage', () => {
  it('使用 conversationId + taskId 幂等写入，并按 Stream 序号恢复同一会话', async () => {
    const memory = createMemoryIndexedDB()
    const storage = createReportTaskStorage({
      databaseName: 'report-storage-test',
      ...memory,
    })

    // createdAt 故意与问题顺序相反，确保恢复不受异步响应返回时间影响。
    await storage.put(task({ taskId: 'task-2', question: '问题 2', streamKey: 'report:conv-1:2', sortOrder: 2, createdAt: 100 }))
    await storage.put(task({ taskId: 'task-1', question: '问题 1', streamKey: 'report:conv-1:1', sortOrder: 1, createdAt: 200 }))
    await storage.put(task({ taskId: 'task-1', question: '问题 1（更新）', streamKey: 'report:conv-1:1', sortOrder: 1, createdAt: 200 }))
    await storage.put(task({ conversationId: 'conv-2', taskId: 'task-x', createdAt: 50 }))

    const records = await storage.list('conv-1')

    expect(records.map(({ taskId, question }) => ({ taskId, question }))).toEqual([
      { taskId: 'task-1', question: '问题 1（更新）' },
      { taskId: 'task-2', question: '问题 2' },
    ])
  })

  it('支持删除单个复合键和清空任务定位记录', async () => {
    const memory = createMemoryIndexedDB()
    const storage = createReportTaskStorage({
      databaseName: 'report-storage-delete-test',
      ...memory,
    })

    await storage.put(task({ taskId: 'task-1' }))
    await storage.put(task({ taskId: 'task-2', createdAt: 200 }))
    await storage.delete('conv-1', 'task-1')
    expect((await storage.list('conv-1')).map((record) => record.taskId)).toEqual(['task-2'])

    await storage.clear()
    expect(await storage.list('conv-1')).toEqual([])
  })

  it('拒绝缺少 taskId/streamKey 的无效记录', async () => {
    const memory = createMemoryIndexedDB()
    const storage = createReportTaskStorage({
      databaseName: 'report-storage-validation-test',
      ...memory,
    })

    await expect(storage.put(task({ taskId: '' }))).rejects.toThrow('ReportTaskRecord.taskId 不能为空')
    await expect(storage.put(task({ streamKey: '' }))).rejects.toThrow('ReportTaskRecord.streamKey 不能为空')
    await expect(storage.put(task({ sortOrder: -1 }))).rejects.toThrow('ReportTaskRecord.sortOrder 必须是非负安全整数')
  })

  it('从 streamKey 末尾解析问题序号，并为旧缓存补齐 sortOrder', () => {
    const conversationId = 'bdbd546c-29c0-11f1-a433-0242c0a87002'
    expect(getReportTaskSortOrder(`report:${conversationId}:1`, 100)).toBe(1)
    expect(getReportTaskSortOrder(`report:${conversationId}:3`, 100)).toBe(3)
    expect(getReportTaskSortOrder(`report:${conversationId}:not-a-number`, 100)).toBe(100)

    const { sortOrder, ...legacyRecord } = task({ streamKey: 'report:conv-1:2', sortOrder: 2 })
    expect(sortOrder).toBe(2)
    expect(normalizeReportTaskRecord(legacyRecord).sortOrder).toBe(2)
  })

  it('无 IndexedDB 支持时返回可读错误', async () => {
    const storage = createReportTaskStorage({ indexedDBFactory: undefined })
    const originalIndexedDB = globalThis.indexedDB

    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: undefined })
    await expect(storage.list('conv-1')).rejects.toThrow('当前浏览器不支持 IndexedDB')
    Object.defineProperty(globalThis, 'indexedDB', { configurable: true, value: originalIndexedDB })
  })
})
