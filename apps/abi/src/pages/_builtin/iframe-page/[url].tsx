import { useBoolean } from 'ahooks';
import { Skeleton } from 'antd';

/**
 * iframe 页面组件
 * 用于在应用内嵌入外部网页
 * 支持加载状态显示和响应式布局
 * @param url - 要嵌入的外部页面URL
 */
export function Component({ url }: { readonly url: string }) {
  // 使用 ahooks 的 useBoolean 管理加载状态
  const [loading, { setFalse: endLoading }] = useBoolean(true);

  return (
    <>
      {/* 加载中时显示骨架屏 */}
      {loading && <Skeleton active />}
      {/* iframe 容器，根据加载状态调整高度 */}
      <div className={loading ? 'h-0' : 'h-full'}>
        <iframe
          className="size-full"
          id="iframePage"
          src={url}
          onLoad={endLoading} // iframe 加载完成后隐藏加载状态
        />
      </div>
    </>
  );
}
