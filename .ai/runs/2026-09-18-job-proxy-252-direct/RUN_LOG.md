# 调度中心接口临时直连 252:9203

## 基本信息

- 日期：2026-09-18
- 任务名称：job-proxy-252-direct
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`（定时任务重构接入 XXL-JOB 调度中心接口）
- 执行 AI：Qoder
- 涉及 agent：Developer
- 任务类型：联调配置 / 临时方案

## 需求摘要

用户提供 Apifox 参考图：调度中心接口直连地址为 `http://192.168.1.252:9203` + `/jobinfo/list`（主机为 http 协议 9203 端口、路径无 `/api` 前缀），要求临时把前端调度接口代理改成该地址联调。

## 影响范围

- `apps/abi/vite.config.ts` 开发代理表中的 `^/api/(jobinfo|jobgroup|joblog)` 规则；仅影响 jobinfo/jobgroup/joblog 三类调度接口，其余 `/api` 仍走 195。
- 仅开发态（`vite serve`）生效，不影响构建产物。

## 修改文件

- `apps/abi/vite.config.ts`

## 实现说明

原规则 target 为 `https://192.168.1.252/` 且不重写路径（转发后带 `/api` 前缀）。改为：

- target：`http://192.168.1.252:9203`
- 新增 `rewrite: path => path.replace(/^\/api/, '')`，使 `/api/jobinfo/list` 转发为 `/jobinfo/list`，与参考图一致。

正则键仍声明在 `/api` 之前保证优先匹配；`JOB_MOCK_DEFAULT` 保持 false，请求真实后端。

## 测试记录

### 执行的命令

- `node -e` 调用 vite `loadConfigFromFile` 加载 `apps/abi/vite.config.ts` 并打印 proxy 表

### 测试结果

- 配置加载无报错；proxy 键序中 `^/api/(jobinfo|jobgroup|joblog)` 位于 `/api` 之前。
- `rewrite('/api/jobinfo/list')` 输出 `/jobinfo/list`，与参考图路径一致。

### 失败和修复过程

`npx vite optimize` 校验方式因依赖扫描过慢超时放弃，改用 `loadConfigFromFile` 直接加载配置校验。

## 回归检查

- 其余代理规则（/api、/chat-proxy、/abi-chat-proxy 等）未改动。
- 邮件记录页 `/api/abi-system/*` 仍走 195。

## Review 改动仅为开发代理 target 与 rewrite，无业务代码变化。

## 发现的问题

代理配置仅在 dev server 启动时读取；改动时 9527 端口已有运行实例（PID 43216），需用户手动重启 dev server 才生效。

## 本轮经验

联调直连地址变化时优先改 vite 代理的 target + rewrite，保持前端请求路径（/api 前缀）稳定，避免改动业务代码。

## 是否需要更新 AI 系统

均不需要（临时联调配置，部署网关后应回退本改动）。

## 后续建议

网关正式路由调度接口后，删除该正则规则或改回网关前缀路径。

## 未解决问题

无。
