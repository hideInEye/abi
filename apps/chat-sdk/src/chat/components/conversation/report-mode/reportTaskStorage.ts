import type { ReportTaskRecord } from './types'

const DEFAULT_DATABASE_NAME = 'xindun-chat-report-mode'
const DATABASE_VERSION = 1
const REPORT_TASK_STORE = 'reportTasks'
const CONVERSATION_CREATED_AT_INDEX = 'byConversationCreatedAt'

interface KeyRangeFactory {
  bound(lower: IDBValidKey, upper: IDBValidKey): IDBKeyRange
}

export interface ReportTaskStorageOptions {
  databaseName?: string
  indexedDBFactory?: IDBFactory
  keyRangeFactory?: KeyRangeFactory
}

export interface ReportTaskStorage {
  put(record: ReportTaskRecord): Promise<ReportTaskRecord>
  list(conversationId: string): Promise<ReportTaskRecord[]>
  delete(conversationId: string, taskId: string): Promise<void>
  clear(): Promise<void>
  close(): void
}

/** V1 已写入浏览器、尚未包含 sortOrder 的历史定位记录。 */
type LegacyReportTaskRecord = Omit<ReportTaskRecord, 'sortOrder'> & {
  sortOrder?: number
}

/**
 * 报告服务约定 streamKey 最后一段是当前会话内的问题序号，例如 `report:<conversation-uuid>:1`。
 * 无法识别的旧/异常 key 使用创建时间兜底，避免恢复流程直接丢失整条记录。
 */
export function getReportTaskSortOrder(streamKey: string, fallback: number): number {
  const match = /(?:^|:)(\d+)$/.exec(streamKey.trim())
  if (!match) return fallback

  const value = Number(match[1])
  return Number.isSafeInteger(value) ? value : fallback
}

/** 读取旧 IndexedDB 数据时补齐 sortOrder，不要求升级或重建 Object Store。 */
export function normalizeReportTaskRecord(record: LegacyReportTaskRecord): ReportTaskRecord {
  const persistedSortOrder = record.sortOrder
  const sortOrder = typeof persistedSortOrder === 'number' && Number.isSafeInteger(persistedSortOrder) && persistedSortOrder >= 0
    ? persistedSortOrder
    : getReportTaskSortOrder(record.streamKey, record.createdAt)

  return {
    ...record,
    sortOrder,
  }
}

/** Stream 序号是主顺序；创建时间和 taskId 只负责处理异常重复序号时的稳定排序。 */
export function sortReportTaskRecords(records: LegacyReportTaskRecord[]): ReportTaskRecord[] {
  return records
    .map(normalizeReportTaskRecord)
    .sort((left, right) => left.sortOrder - right.sortOrder
      || left.createdAt - right.createdAt
      || left.taskId.localeCompare(right.taskId))
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('IndexedDB 请求失败'))
  })
}

function transactionToPromise(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error || new Error('IndexedDB 事务失败'))
    transaction.onabort = () => reject(transaction.error || new Error('IndexedDB 事务已中止'))
  })
}

function validateRecord(record: ReportTaskRecord): void {
  const requiredTextFields: Array<keyof Pick<ReportTaskRecord, 'conversationId' | 'sessionId' | 'taskId' | 'question' | 'streamKey'>> = [
    'conversationId',
    'sessionId',
    'taskId',
    'question',
    'streamKey',
  ]

  for (const field of requiredTextFields) {
    if (!record[field].trim()) {
      throw new Error(`ReportTaskRecord.${field} 不能为空`)
    }
  }

  if (!Number.isFinite(record.createdAt) || record.createdAt < 0) {
    throw new Error('ReportTaskRecord.createdAt 必须是非负有限数字')
  }

  if (!Number.isSafeInteger(record.sortOrder) || record.sortOrder < 0) {
    throw new Error('ReportTaskRecord.sortOrder 必须是非负安全整数')
  }
}

function getDefaultIndexedDBFactory(): IDBFactory | undefined {
  return typeof globalThis.indexedDB === 'undefined' ? undefined : globalThis.indexedDB
}

function getDefaultKeyRangeFactory(): KeyRangeFactory | undefined {
  return typeof globalThis.IDBKeyRange === 'undefined' ? undefined : globalThis.IDBKeyRange
}

/**
 * 原生 IndexedDB Promise 封装。
 * 数据库只保存任务定位信息，不缓存 Redis 事件、报告正文、ToDo 状态或 lastId。
 */
export function createReportTaskStorage(options: ReportTaskStorageOptions = {}): ReportTaskStorage {
  const databaseName = options.databaseName || DEFAULT_DATABASE_NAME
  let databasePromise: Promise<IDBDatabase> | undefined

  function getIndexedDBFactory(): IDBFactory {
    const factory = options.indexedDBFactory || getDefaultIndexedDBFactory()
    if (!factory) throw new Error('当前浏览器不支持 IndexedDB，报告任务无法保证刷新恢复')
    return factory
  }

  function getKeyRangeFactory(): KeyRangeFactory {
    const factory = options.keyRangeFactory || getDefaultKeyRangeFactory()
    if (!factory) throw new Error('当前环境不支持 IDBKeyRange')
    return factory
  }

  function openDatabase(): Promise<IDBDatabase> {
    if (databasePromise) return databasePromise

    databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      const request = getIndexedDBFactory().open(databaseName, DATABASE_VERSION)

      request.onupgradeneeded = () => {
        const database = request.result
        const store = database.objectStoreNames.contains(REPORT_TASK_STORE)
          ? request.transaction!.objectStore(REPORT_TASK_STORE)
          : database.createObjectStore(REPORT_TASK_STORE, { keyPath: ['conversationId', 'taskId'] })

        if (!store.indexNames.contains(CONVERSATION_CREATED_AT_INDEX)) {
          // 该索引用于高效过滤某个会话；取回后再按持久化的 Stream 序号稳定排序。
          store.createIndex(CONVERSATION_CREATED_AT_INDEX, ['conversationId', 'createdAt'], { unique: false })
        }
      }

      request.onsuccess = () => {
        const database = request.result
        database.onversionchange = () => {
          database.close()
          databasePromise = undefined
        }
        resolve(database)
      }
      request.onerror = () => {
        databasePromise = undefined
        reject(request.error || new Error('报告任务 IndexedDB 打开失败'))
      }
      request.onblocked = () => {
        databasePromise = undefined
        reject(new Error('报告任务 IndexedDB 升级被其他页面阻塞'))
      }
    })

    return databasePromise
  }

  return {
    async put(record) {
      validateRecord(record)
      const database = await openDatabase()
      const transaction = database.transaction(REPORT_TASK_STORE, 'readwrite')
      const request = transaction.objectStore(REPORT_TASK_STORE).put(record)

      await Promise.all([requestToPromise(request), transactionToPromise(transaction)])
      return { ...record }
    },

    async list(conversationId) {
      if (!conversationId.trim()) return []

      const database = await openDatabase()
      const transaction = database.transaction(REPORT_TASK_STORE, 'readonly')
      const index = transaction.objectStore(REPORT_TASK_STORE).index(CONVERSATION_CREATED_AT_INDEX)
      const range = getKeyRangeFactory().bound([conversationId, 0], [conversationId, Number.MAX_SAFE_INTEGER])
      const records = await requestToPromise(index.getAll(range) as IDBRequest<LegacyReportTaskRecord[]>)

      await transactionToPromise(transaction)
      return sortReportTaskRecords(records)
    },

    async delete(conversationId, taskId) {
      const database = await openDatabase()
      const transaction = database.transaction(REPORT_TASK_STORE, 'readwrite')
      const request = transaction.objectStore(REPORT_TASK_STORE).delete([conversationId, taskId])

      await Promise.all([requestToPromise(request), transactionToPromise(transaction)])
    },

    async clear() {
      const database = await openDatabase()
      const transaction = database.transaction(REPORT_TASK_STORE, 'readwrite')
      const request = transaction.objectStore(REPORT_TASK_STORE).clear()

      await Promise.all([requestToPromise(request), transactionToPromise(transaction)])
    },

    close() {
      void databasePromise?.then((database) => database.close())
      databasePromise = undefined
    },
  }
}

export const reportTaskStorage = createReportTaskStorage()
