import DashboardMicroApp from './DashboardMicroApp'
import styles from './index.module.css'

export function Component() {
  return (
    <DashboardMicroApp
      className={styles['abi-dashboard']}
      containerId="abi-dashboard"
      initialPath="/projects"
    />
  )
}
