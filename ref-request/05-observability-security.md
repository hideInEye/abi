# 05｜可观测性与安全（错误、性能、权限、配置）

## 1. 可观测性（当前缺口）

### 1.1 全局错误兜底不足

- `apps/abi/src/main.tsx`：ErrorBoundary 相关代码被注释
- `apps/chat`：缺少统一错误边界与“关键链路”日志（如 SSE、图表渲染、录音等）

建议：

- 恢复/引入顶层 ErrorBoundary（React Error Boundary 或自研）
- 统一错误上报（Sentry/自建平台），包含：
  - JS runtime error
  - API error（含请求耗时、错误码、traceId）
  - 关键用户行为/路由跳转

### 1.2 性能监控缺失

建议：

- 在入口处采集 Web Vitals（LCP/INP/CLS）与自定义指标（如 SSE 首 token 时间、对话完成耗时）
- 为重页面（对话页/工作台）加“首屏与交互”埋点，便于回归验证

## 2. 安全（当前高风险）

### 2.1 硬编码 token/调试凭证（见 P0）

- 必须彻底移除，并补充提交前扫描/CI 检测

### 2.2 token 存储与传输

现状：

- 多处读取 localStorage/localStg/cookie，且多套逻辑并存（abi/chat）

建议：

- 明确统一方案：
  - 若使用 Bearer token：收敛到 request 层统一注入，避免全局 patch fetch/xhr
  - 更优方案：HTTP-only cookie + CSRF 防护（视后端能力）
- 定义 refresh/过期策略：401 统一处理、重试策略、并发刷新去重

### 2.3 CORS 配置需复核

- `nginx/abi.conf`：`Access-Control-Allow-Origin '*'` 与 `Allow-Credentials true` 组合本身不合理，且开放过宽

建议：

- 明确允许的 origin 列表（按环境区分）
- credentials 与 allow-origin 的组合按规范配置

## 3. 权限模型（风险与建议）

现状风险：

- 角色结构与权限判断逻辑不一致（见 P1-4），容易出现权限绕过或误拒

建议：

- 统一 `roles/permissions` 类型与来源
- 路由/菜单/按钮权限走同一模型，可测、可配置
- 引入权限单测与“最小权限”验证用例

