import AsyncStorage from '@react-native-async-storage/async-storage'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'

const CACHE_KEY = 'getdailyme-query-cache'

export function createCachePersister() {
  return createAsyncStoragePersister({
    key: CACHE_KEY,
    throttleTime: 1000,
    storage: AsyncStorage,
  })
}

export async function clearPersistedCache() {
  await AsyncStorage.removeItem(CACHE_KEY)
}
