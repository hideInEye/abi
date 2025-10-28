import ExceptionBase from '@/components/stateless/common/ExceptionBase';

/**
 * 500 服务器错误页面组件
 * 当服务器发生内部错误时显示此组件
 * 使用通用的异常页面基础组件
 */
export function Component() {
  return <ExceptionBase type="500" />;
}

Component.displayName = 'GoWRONG';
