import { useLocation } from 'react-router-dom'

import DashboardMicroApp from '@/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp'

export function Component() {
  const location = useLocation()

  return (
    <DashboardMicroApp
      containerId="abi-dashboard-designer"
      initialPath={`${location.pathname}${location.search}`}
      style={{ height: '100vh' }}
    />
  )
}
