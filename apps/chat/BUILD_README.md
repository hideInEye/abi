# 打包成qiankun子应用注意点

1. api请求地址修改
打包前设置：在`/public/config.json`文件中
打包后也可以再次修改：`dist/config.json`

```js
{
  "VITE_AGENT_BASE_API": "http://123.181.192.131:81/api/copilot", // 通过agentId获取对应信息的接口地址
  "VITE_CHAT_BASE_API": "http://123.181.192.131:81/chat" // 对话的接口地址
}
```

2. 路由设置

在`main.tsx`中，有下边一行代码：
```tsx
  <BrowserRouter basename={(qiankunWindow as any)?.__POWERED_BY_QIANKUN__ ? basename : '/chat-ui'}>
```
当是qiankun子应用时，basename采用主应用传过来的basename（举例：在chatbi中，此地址为/assistant-manage/assistant-config）；
当独立部署时是后边的路径`/chat-ui`
