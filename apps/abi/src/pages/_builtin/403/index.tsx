import ExceptionBase from '@/components/stateless/common/ExceptionBase';

/**
 * 403 无权限页面组件
 * 当用户访问没有权限的页面时显示此组件
 * 使用通用的异常页面基础组件
 */
export function Component() {
  return <ExceptionBase type="403" />;
}

Component.displayName = 'NotAuth';
