interface StorageLike {
  getItem: (key: string) => string | null
  removeItem: (key: string) => void
}

export function clearLegacyRememberedCredentials(storage: StorageLike): void {
  if (storage.getItem('loginInfo') !== null) storage.removeItem('loginInfo')
}
