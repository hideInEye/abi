interface FlatRequestResultLike {
  error?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/** Flat requests resolve both success and failure; only an explicit null error is success. */
export function isFlatRequestSuccess(result: unknown): boolean {
  return isRecord(result) && Object.hasOwn(result, 'error') && (result as FlatRequestResultLike).error === null
}

export function assertFlatRequestSuccess(result: unknown, fallbackMessage = '接口请求失败'): void {
  if (isFlatRequestSuccess(result)) {
    return
  }

  if (isRecord(result) && Object.hasOwn(result, 'error')) {
    const error = (result as FlatRequestResultLike).error
    if (error) {
      throw error
    }
  }

  throw new Error(fallbackMessage)
}
