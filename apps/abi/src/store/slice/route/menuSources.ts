export interface MenuSourceResult<T = unknown> {
  data: T
  error?: unknown
}

type MenuSourceLoader<T> = () => Promise<MenuSourceResult<T>>

function settleMenuSource<T>(loader: MenuSourceLoader<T>): Promise<MenuSourceResult<T | null>> {
  return loader().catch(error => ({ data: null, error }))
}

export async function loadMenuSources<SystemMenu, SpaceMenu>(
  loadSystemMenu: MenuSourceLoader<SystemMenu>,
  loadSpaceMenu: MenuSourceLoader<SpaceMenu>,
) {
  const systemMenuRequest = settleMenuSource(loadSystemMenu)
  const spaceMenuRequest = settleMenuSource(loadSpaceMenu)

  const [systemMenu, spaceMenu] = await Promise.all([systemMenuRequest, spaceMenuRequest])
  return { spaceMenu, systemMenu }
}

