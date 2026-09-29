import { store } from '@/store'
import { resetStore } from '@/store/slice/auth'

export async function resetAbiAuthState() {
  await store.dispatch(resetStore())
}
