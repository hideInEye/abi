# 2026-09-18 job 定时任务接口 E2E 联调测试

## 范围

对 252:9203 真实调度中心（经 9527 vite 代理，同时验证代理链路）跑通定时任务模块全部接口。脚本：本目录 `job-e2e-probe.ps1`（可重跑，幂等：创建→验证→自删）。

## 结果（全部经 /api 代理前缀 → rewrite → 后端）

| 接口 | 方法 | 结果 |
| --- | --- | --- |
| /jobinfo/list | GET | 200，必填参数（name/executorHandler/author/triggerStatus/jobGroup）齐备时正常 |
| /jobinfo (创建) | POST | 200，返回新任务 id；CRON 类型 + 中文名 payload 正常 |
| /jobinfo/{id} | GET | 200，字段回显与提交一致（route/conf/retry 等） |
| /jobinfo/{id} (更新) | PUT | 200，二次 GET 验证 scheduleConf、executorFailRetryCount 已变更 |
| /jobinfo/nextTriggerTime | POST | 200，返回后续 5 次触发时间 |
| /jobinfo/{id}/start | POST | 200 |
| /jobinfo/{id}/trigger | POST | 200 |
| /jobinfo/{id}/stop | POST | 200 |
| /jobinfo/{id} (删除) | DELETE | 200；二次 GET 返回"任务不存在"（删除生效） |
| /jobgroup/list | GET | 200（前轮已测） |
| /jobgroup/{id} | GET | 200，registryList 为空（该执行器当前无在线注册节点） |
| /joblog/list | GET | 200；不带 jobId 时后端 500 必填——印证 API 层默认值修复必要且正确 |

## 未测接口（破坏性/无数据）

- `/joblog/{id}/detail`、`/joblog/{id}/content`：trigger 后 joblog total 仍为 0（可能删除任务连带清日志，或异步未落），待有真实日志后测
- `/joblog/{id}/kill`、`/joblog/clean`：清理类接口，避免误删联调环境数据未主动调用

## 数据清理

- 探测期间创建的 `probe-*` 任务 12 条（id 7~18）与 E2E 任务（id 20）已全部删除
- 终态 jobinfo total=1，为用户自己在页面创建的任务，未触碰

## 遗留观察

- 执行器 `common-job-executor` 无注册节点时 trigger 也返回 Success 但不产生日志，调度日志页要出真实数据需后端执行器在线或等待 cron 实际触发
