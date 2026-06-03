import DashboardMicroApp from '@/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp';
import styles from './index.module.css'

export function Component() {
  return (
    <DashboardMicroApp
      className={styles['my-dashboard']}
      containerId="my-screen-dashboard"
      initialPath="/my-screen"
    />
  );
}
