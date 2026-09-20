# 2026-09-18 job 新增偶发「路由策略非法」修复（折叠字段兜底）

## 现象

页面新增任务偶发报「路由策略非法」：有时成功有时失败；而接口 E2E 直测全部通过。

## 根因

高级配置默认折叠，折叠时 `executorRouteStrategy/misfireStrategy/executorBlockStrategy/childJobId` 等 Form.Item 从未挂载注册，antd `validateFields()` 不返回未注册字段的值，payload 整个缺失这些键 → 后端收到 null → 「路由策略非法」。用户展开过高级配置再保存时字段已注册，所以间歇性成功。curl 复现：payload 去掉 `executorRouteStrategy`（其余同 E2E）→ 后端返回"路由策略非法"；E2E 脚本因显式携带全部策略字段所以全过。

## 改动

`apps/abi/src/pages/workbench/job/time/modules/job-form-modal.tsx`

- 新增 `ADVANCED_SUBMIT_DEFAULTS`（与 DEFAULT_VALUES 高级区一致：childJobId/executorBlockStrategy/executorFailRetryCount/executorParam/executorRouteStrategy/executorTimeout/glueType/misfireStrategy）
- submit 时 `merged = { ...ADVANCED_SUBMIT_DEFAULTS, ...values }`，后续统一用 merged；用户展开并改过的值优先，未注册字段走默认值

## 验证

- curl 复现根因（缺字段 → 路由策略非法；带字段 → 200）
- tsc 无错误；eslint 无新增错误（252 行 unused-vars 为文件既有基线）
- 待用户页面复测：折叠高级配置直接保存应成功

## 教训

后端必填、但 UI 上可能不挂载（折叠/条件渲染）的字段，必须在提交边界兜底，不能依赖 validateFields 返回。
