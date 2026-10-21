import type { CurrentSpaceInfo } from '../store/slice/app/types'

const SPACE_ID_KEY = 'spaceId'
const SPACE_NAME_KEY = 'spaceName'

function readStorageValue(key: string) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStorageValue(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // localStorage 不可写时只影响刷新恢复，不阻断当前操作。
  }
}

function removeStorageValue(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function readPersistedSpaceId() {
  const value = readStorageValue(SPACE_ID_KEY)
  if (!value) return 0

  const spaceId = Number(value)
  return Number.isFinite(spaceId) && spaceId > 0 ? spaceId : 0
}

export function readPersistedSpaceName() {
  return readStorageValue(SPACE_NAME_KEY) || ''
}

export function persistCurrentSpaceInfo(space: CurrentSpaceInfo | null) {
  if (!space) {
    removeStorageValue(SPACE_ID_KEY)
    removeStorageValue(SPACE_NAME_KEY)
    return
  }
  // Chat 和旧业务仍读取这两个键；由 store 的单一设置入口成对写入。
  writeStorageValue(SPACE_NAME_KEY, space.spaceName)
  writeStorageValue(SPACE_ID_KEY, String(space.spaceId))
}
