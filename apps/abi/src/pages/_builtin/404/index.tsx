import ExceptionBase from '@/components/stateless/common/ExceptionBase';

/**
 * 404 页面未找到组件
 * 当用户访问不存在的页面路由时显示此组件
 * 使用通用的异常页面基础组件
 */
export function Component() {
  return <ExceptionBase type="404" />;
}

Component.displayName = 'NotFound';
