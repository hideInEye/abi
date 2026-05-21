/**
 * chat 当前按独立 SPA 通过 `/chat-ui/` 代理访问，不再由主应用 qiankun 注册。
 * 保留空函数是为了兼容历史导入，避免后续误注册影响主应用路由。
 */
export function registerAiBotMicroApp() {
  return undefined;
}
