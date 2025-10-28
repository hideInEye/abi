# 打包注意点

1. api请求地址
文件：`.env.prod`
VITE_SERVICE_API_URL
VITE_CHAT_SERVICE_BASE_URL
VITE_MICRO_AI_BOT_ENTRY

2. 静态文件地址（兼动态路由basename）
文件：`.env`
```bash
# qiankun子应用
VITE_BASE_URL=/subapp/chatbi

# 非qiankun
VITE_BASE_URL=/
```


3. 对话sdk传参basename

文件：`src/pages/ai-assistant/conversational-analysis/index.tsx`

```tsx
// 手动加载子应用
const microApp = loadMicroApp({
  // activeRule: '/ai-assistant/conversational-analysis',
  container: '#ai-bot',
  entry: import.meta.env.VITE_MICRO_AI_BOT_ENTRY,
  name: 'ai-bot',
  props: {
    // chatbi作为qiankun子应用的传参
    basename: (qiankunWindow as any)?.__POWERED_BY_QIANKUN__
      ? '/studio/chatbi/ai-assistant/conversational-analysis'
      : `${VITE_BASE_URL}/ai-assistant/conversational-analysis`


    //  chatbi作为非qiankun的传承
    basename: '/ai-assistant/conversational-analysis'
  }
});
```
