let dashboardPrefetchStarted = false

export function isDashboardMicroAppRouteKey(routeKey: string) {
  return routeKey === 'workbench_screen-manage_abi-dashboard'
    || routeKey === 'workbench_app-workshop_my-dashboard'
}

export function prefetchDashboardMicroApp() {
  const entry = import.meta.env.VITE_MICRO_ABI_DASHBOARD_ENTRY
  if (!entry || dashboardPrefetchStarted) return

  dashboardPrefetchStarted = true
  void Promise.all([
    import('qiankun'),
    import('@/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp'),
  ])
    .then(([{ prefetchApps }]) => {
      prefetchApps([{ name: 'abi-dashboard', entry }])
    })
    .catch(() => {
      dashboardPrefetchStarted = false
    })
}
