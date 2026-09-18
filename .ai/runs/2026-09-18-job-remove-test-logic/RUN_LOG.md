# 2026-09-18 job 模块撤除联调测试逻辑、切换网关正式路径

## 背景

调度中心后端已部署到 195 网关，正式路径为 `/api/abi-scheduler/jobinfo|jobgroup|joblog/...`（Apifox 截图证实）。联调期引入的临时机制全部撤除。

## 改动

1. `apps/abi/src/service/api/job.ts`
   - 16 个接口 URL 统一加 `abi-scheduler` 网关前缀
   - `jobRequest` 移除 mock 分流，直连 `apiRequest`
2. `apps/abi/vite.config.ts`：删除 `^/api/(jobinfo|jobgroup|joblog)` → 252:9203 临时直连代理规则，调度接口回归 `/api` → 195 统一代理
3. 删除 `job-mock.ts`、`job-mock.test.ts`（mock 层整体退役，grep 确认无残留引用）
4. `job.test.ts`：契约断言 URL 更新为网关路径，移除 mock 开关依赖
5. 临时探测脚本 `joblog-e2e-probe.ps1` 归档至本目录

## 验证

- `pnpm test -- apps/abi/src/service/api/job.test.ts`：7/7 通过
- `tsc --noEmit`：本轮改动文件零错误（job 页面既有基线错误与本次无关）

## 注意

- **需重启 dev server** 使 vite 代理变更生效
- 必填参数默认值兜底（joblist/joblog 筛选参数）保留——网关后仍是同一套 XXL 后端校验
- 日志 detail「日志ID非法」/ content NPE 属后端问题，与前端路径切换无关，待后端修复后复测
