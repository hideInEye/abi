# 指标建模预计算与派生指标接口联调运行记录

## 基本信息

- 日期：2026-08-26
- 分支：`dev/zanghb-ontology-iteration`
- 需求依据：`.ai/requirements/CURRENT_REQUIREMENT.md` 第七节
- 影响范围：ABI 属性建模中的预计算配置、普通派生指标统计口径、主体维度和业务限定表达式
- 回归截图：未保存到项目

## 需求映射

1. 顶层 `updateFrequency` 由内部 `PrecomputeConfig` 构建为 `frequency/minute/day_of_week/day_of_month` 对象，非适用字段显式传 `null`；编辑优先解析新对象，并兼容旧字符串与 `calcLogic.precomputeConfig`。
2. 普通派生指标新增 `calcLogic.calcPeriod`，完成 12 种日期方式、动态周期值/单位及全天/指定时段的双向映射；旧 `statisticalCaliber` 继续双写。
3. 主体维度新增 `calcLogic.subjectDimension = { dim_id, dim_name }`；维度名称由当前维度树选项同步到表单，新结构优先回显，旧 `statisticalCaliber.subjectDimensionId` 保持兼容。
4. 普通派生指标新增 `calcLogic.indicator_templates.layers`；分层、条件分组、字段元数据、10 种运算符和条件值按后端协议转换，旧 `expressions` 继续双写。
5. 新模板条件的 `conditionId` 使用语义字段 ID，UI 条件行继续生成独立 ID；历史数组值回显为逗号分隔文本。
6. 普通派生指标启用层级统一逻辑：切换连接符同步当前层或当前组的同级连接符，新增项继承现有逻辑；历史混合逻辑不自动改变，在下一步或保存时阻止提交并定位首个不一致项。标签语义仍允许混合逻辑。

## 验证结果

- 标签语义域 Vitest：通过，17 个测试文件、116 项测试全部通过。
- 新增/更新协议定向 Vitest：通过，覆盖四种计算频率、12 种日期方式、主体维度、新旧协议优先级、模板层级、10 种运算符、数组回显和统一逻辑校验。
- ABI 改动 TypeScript/TSX 文件 ESLint：通过；仅输出环境既有的 pyenv rehash 权限提示。
- `pnpm --filter chatbi build`：通过。
- `git diff --check`：通过。
- `pnpm --filter chatbi typecheck`：未通过；仓库存在大量既有类型错误。过滤本轮 `metric-modeling/rule-expression` 后无本轮文件错误。
- `pnpm test`：所有已执行测试用例通过，但覆盖率收集阶段因引用不存在的 `apps/abi/dist/assets/DragContent-wcqG8zd_.js` 旧哈希文件而退出失败；与本轮业务代码无关。
- 浏览器检查：本地 ABI 登录页可正常加载；隔离会话没有登录态，未把聊天中的密码写入命令、状态文件或项目，因此未执行登录后的表单联调。

## 回归检查

- 普通派生指标：新协议构建、旧协议回显、新协议优先级、表达式完整性与统一逻辑均已通过纯函数/组件测试。
- 标签语义：共享组件默认不开启统一逻辑，混合 AND/OR 校验行为不变；新增条件仍不会自动触发表达式校验。
- 衍生模板 `derivative`：仍使用原有 `indicator_templates` 模板对象；新层级解析器仅在存在 `layers` 时接管。
- 原子及其他指标类型：仍写入旧 `calcLogic.precomputeConfig`，顶层 `updateFrequency` 统一由表单配置生成对象。

## 风险与待办

- 历史数据只有主体维度 ID、且维度树加载失败时，`dim_name` 暂回退为维度 ID；维度树成功加载后会自动补为当前维度名称。
- 登录后的真实接口请求仍建议由已登录浏览器补做一次新增、编辑和 Network Payload 验证。
- 全量类型检查和覆盖率收集的仓库既有阻塞需在独立任务中处理。

## AI 开发系统更新判断

- 已更新：`.ai/requirements/CURRENT_REQUIREMENT.md`。
- 已新增：本运行记录。
- 无需更新：`.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/`、`.ai/decisions/`。
