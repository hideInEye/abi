import DashboardMicroApp from '@/pages/workbench/screen-manage/abi-dashboard/DashboardMicroApp';

export function Component() {
  return (
    <DashboardMicroApp
      containerId="my-screen-dashboard"
      initialPath="/my-screen"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
