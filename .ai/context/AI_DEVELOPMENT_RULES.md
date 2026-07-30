# AI Development Rules

## 开工前

1. 必须读取 `AGENTS.md`、`.ai/README.md` 和本目录关键 context。
2. 必须读取 `.ai/requirements/CURRENT_REQUIREMENT.md`。
3. 必须确认需求类型、目标、非目标、影响范围、验收标准、测试要求。
4. 必须检查当前 `git status`，识别用户已有改动。

## 编码中

1. 只修改完成需求所需文件。
2. 不恢复、不覆盖用户已有未说明改动。
3. 不随意修改业务逻辑以满足测试。
4. 新增 API 走现有 request 封装。
5. 新增共享逻辑优先放 `packages/*`，但必须保持业务无关。
6. 新增 app 内逻辑优先放当前 domain，不要过早抽象。
7. UI 修改按所属 app 样式系统执行。
8. 新增或接入 qiankun 微应用时必须启用样式隔离；微应用样式不得污染宿主全局 `html` / `body`，业务背景应写到微应用 root 容器或局部作用域。

## 测试与验证

1. 有测试脚本时必须尽量运行。
2. 不能运行时必须记录原因和替代验证。
3. Bug fix 必须优先添加或说明无法添加回归测试。
4. 共享包改动必须至少运行相关 unit tests 和受影响 app 的 type/build。

## 完成后

1. 生成 run log。
2. 汇总修改文件、测试结果、风险、未解决事项。
3. 判断是否更新 `.ai/context`、`.ai/prompts`、`.ai/agents`、`.ai/skills`、`.ai/mcp`、`.ai/checklists`、`.ai/decisions`。
4. 不要声称未验证内容已经通过。

## 长期规则筛选

只有稳定、可复用、会影响后续开发的发现才写入长期规则。一次性问题写入 run log 或 `KNOWN_RISKS.md`。
