const storagePrefix = import.meta.env.VITE_STORAGE_PREFIX || '';

type StorageKind = 'local' | 'session';

function createStorage<T extends object>(type: StorageKind, prefix: string) {
  const storage = type === 'session' ? window.sessionStorage : window.localStorage;

  return {
    clear() {
      storage.clear();
    },
    get<K extends keyof T>(key: K): T[K] | null {
      const storageKey = `${prefix}${key as string}`;
      const json = storage.getItem(storageKey);
      if (json) {
        try {
          const value = JSON.parse(json) as T[K];
          if (value) return value;
        } catch {}
      }

      storage.removeItem(storageKey);
      return null;
    },
    remove(key: keyof T) {
      storage.removeItem(`${prefix}${key as string}`);
    },
    set<K extends keyof T>(key: K, value: T[K]) {
      storage.setItem(`${prefix}${key as string}`, JSON.stringify(value));
    }
  };
}

export const localStg = createStorage<StorageType.Local>('local', storagePrefix);

export const sessionStg = createStorage<StorageType.Session>('session', storagePrefix);

export async function loadLocalforage() {
  const { createLocalforage } = await import('@sa/utils/storage');
  return createLocalforage<StorageType.Local>('local');
}
