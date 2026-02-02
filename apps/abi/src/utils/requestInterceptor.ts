import { handleLoginExpired, isTokenExpired } from './auth';
import { localStg } from './storage';

/**
 * 全局请求拦截器
 * 在发送请求前检查token是否过期
 */
export function setupRequestInterceptor() {
  // 拦截所有fetch请求
  const originalFetch = window.fetch;
  
  window.fetch = async function(input: RequestInfo | URL, init?: RequestInit) {
    // 检查token是否过期
    const token = localStg.get('token');
    if (token && isTokenExpired(token)) {
      handleLoginExpired();
      return new Response('Token expired', { status: 401 });
    }
    
    // 继续原始请求
    return originalFetch.call(this, input, init);
  };

  // 拦截XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;
  
  XMLHttpRequest.prototype.open = function(method: string, url: string | URL, async?: boolean, username?: string | null, password?: string | null) {
    // 检查token是否过期
    const token = localStg.get('token');
    if (token && isTokenExpired(token)) {
      handleLoginExpired();
      return;
    }
    
    return originalXHROpen.call(this, method, url, async ?? true, username, password);
  };
  
  XMLHttpRequest.prototype.send = function(body?: Document | XMLHttpRequestBodyInit | null) {
    // 检查token是否过期
    const token = localStg.get('token');
    if (token && isTokenExpired(token)) {
      handleLoginExpired();
      return;
    }
    
    return originalXHRSend.call(this, body);
  };

  // 返回清理函数，供 qiankun 等场景卸载时恢复全局对象
  return () => {
    try {
      window.fetch = originalFetch;
    } catch {}
    try {
      XMLHttpRequest.prototype.open = originalXHROpen;
    } catch {}
    try {
      XMLHttpRequest.prototype.send = originalXHRSend;
    } catch {}
  };
}
