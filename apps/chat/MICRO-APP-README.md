# 此应用为子应用，主应用改如何配置

使用的是qiankun微前端，主应用配置方式，[官网方案参考](https://qiankun.umijs.org/zh/guide/tutorial#%E4%B8%BB%E5%BA%94%E7%94%A8)

主应用不限技术栈，只需要提供一个容器 DOM，然后注册微应用并 start 即可。

主应用为React，将此子应用嵌入到某个组件中：
1. 先安装 qiankun ：

```bash
$ yarn add qiankun # 或者 npm i qiankun -S
```

2. 使用 `loadMicroApp` 手动加载子应用
如果你需要更灵活地控制子应用的加载，可以使用 loadMicroApp 手动加载子应用，而不是使用 registerMicroApps 和 start。

```tsx
import React, { useEffect } from 'react';
import { loadMicroApp } from 'qiankun';

function App() {
  useEffect(() => {
    const container = document.getElementById('ai-bot');
    if (!container) {
      console.error('Container #ai-bot not found');
      return;
    }

    // 手动加载子应用
    const microApp = loadMicroApp({
      container: '#ai-bot', // 挂载子应用的dom
      entry: '//localhost:5173', // 子应用的服务地址
      name: 'ai-bot', // 子应用名称，一般和子应用package.json中的name一致
      props: {} // 传参
    });

    return () => {
      // 卸载子应用
      microApp.mountPromise.then(() => microApp.unmount());
    };
  }, []);

  return (
    <div>
      <div id="ai-bot"></div>
    </div>
  );
}

export default App;
```
