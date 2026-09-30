import { useParams } from 'react-router-dom'

import DashboardMicroApp from '@/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp'

export function Component() {
  const { shareCode = '' } = useParams<{ shareCode: string }>()

  return (
    <DashboardMicroApp
      containerId="abi-dashboard-dr"
      initialPath={`/share_url/${shareCode}`}
      style={{ height: '100vh' }}
    />
  )
}
