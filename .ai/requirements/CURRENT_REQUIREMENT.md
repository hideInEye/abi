# 自定义指标预计算配置显示条件修复

## 文档状态

- 状态：已实现并完成自动化验证，待登录后的界面回归。
- 日期：2026-09-07。
- 需求来源：用户要求自定义创建指标时，原子指标隐藏“预计算配置”，仅派生指标和衍生指标显示。
- 影响范围：`apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling` 及对应小模块测试。

## 目标

1. 指标类型为原子指标（`atomic`）时，不渲染“预计算配置”模块。
2. 指标类型为派生指标（`derived`）或衍生指标（`derivative`）时，继续显示“预计算配置”模块。
3. 指标类型切换后，显示状态立即同步；原子指标进入下一步或提交时不校验已经隐藏的预计算字段。

## 非目标

- 不修改指标创建、编辑接口、提交参数或预计算配置的数据结构及默认值。
- 不修改指标类型选项、其他业务配置模块、技术属性和维度配置。
- 不修改本体网络其他模块，不覆盖用户已有未提交改动。

## 验收标准

1. 新建指标选择原子指标后，页面不出现“预计算配置”。
2. 选择派生指标或衍生指标后，页面正常出现“预计算配置”。
3. 从派生/衍生切换为原子指标后，即使此前预计算字段无效，也不会因隐藏字段校验而阻断下一步或提交。
4. 既有预计算配置保存和回显协议保持不变。

## 测试要求

- 在指标建模小模块测试中覆盖 `atomic`、`derived`、`derivative` 及未知值的显示判断。
- 执行指标建模定向 Vitest、`pnpm --filter chatbi typecheck`、`pnpm --filter chatbi build` 与 `git diff --check`。
- 创建 `.ai/runs/2026-09-07-metric-precompute-visibility/RUN_LOG.md`。

---

# 自定义维度“保存并配置层级”新建 ID 衔接修复

## 文档状态

- 状态：已实现并完成自动化验证，待登录后的真实接口回归。
- 日期：2026-09-07。
- 需求来源：用户反馈新建自定义维度点击“保存并配置层级”后，层级结构保存提示“层级参数构建失败”，而从列表进入层级配置正常。
- 影响范围：`apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/dimension-modeling` 及对应测试。

## 目标

1. 新建维度接口成功后，保留接口返回的真实维度 ID，并将其传给随后打开的层级配置弹窗。
2. “保存并配置层级”仅在维度保存成功且取得有效维度 ID 后进入层级配置；失败时不得进入下一步。
3. 普通“保存”、编辑维度后配置层级、列表直接进入层级配置保持原行为。

## 非目标

- 不修改维度创建、编辑、层级保存接口路径及请求协议。
- 不修改层级结构编辑、拖拽、字段选择或展示样式。
- 不修改本体网络其他模块；保留用户在 `AttributeDrawer.tsx` 中的既有未提交改动。

## 验收标准

1. 新建接口响应中的 `dimId`、`id` 或 `dimensionId` 能被识别，兼容 flat request 的 `data` 与原始 `response.data.data` 包装。
2. 点击“保存并配置层级”后，层级弹窗使用新建维度的真实 ID，保存时能够构造 `{ spaceId, dimId, groups }`。
3. 创建接口失败时不关闭创建抽屉、不打开层级配置；接口成功但缺少有效 ID 时不打开无法保存的层级弹窗。
4. 编辑态继续使用原维度 ID，从列表打开层级配置不受影响。

## 测试要求

- 在维度建模小模块现有测试中覆盖新建响应 ID 的多种结构、无 ID 回退和层级 payload 使用真实 ID。
- 执行维度建模定向 Vitest、接口调用契约测试、`pnpm --filter chatbi typecheck`、`pnpm --filter chatbi build` 与 `git diff --check`。
- 创建 `.ai/runs/2026-09-07-dimension-save-and-configure-hierarchy/RUN_LOG.md`。

---

# 本体网络一键映射名称展示统一修复

## 文档状态

- 状态：已实现并完成自动化验证，待登录后的界面回归。
- 日期：2026-09-02。
- 需求来源：用户要求修复属性建模一键映射名称展示不一致问题。
- 影响范围：`apps/abi/src/pages/workbench/ontology-kg/**` 中映射中文名、英文名的展示适配与对应测试。

## 目标

1. 一键映射提交继续使用中文名 `表中文名称_#_字段中文名称`、英文名 `表英文名称.字段英文名称`。
2. 本体网络展示映射名称时，中文名称统一只显示字段中文名称，英文名称统一只显示字段英文名称。
3. 维度和指标编辑回显显示字段名称，编辑保存后仍保留原表名称前缀并按原协议提交。
4. 修复维度/指标列表与编辑、指标维度选择器、实体属性列表与绑定资产、图谱详情属性标签中的不一致展示。

## 非目标

- 不修改一键映射接口、请求参数、映射提交格式、资产 ID、属性编码原值或保存协议。
- 不修改没有映射分隔符的自定义名称。
- 不修改属性建模之外的业务逻辑、样式、接口时序或全局组件。
- 不处理当前需求文件中用户已有的冲突标记或历史需求内容。

## 验收标准

1. `交易明细表_#_收货城市` 在列表、编辑和选择器中显示为 `收货城市`，保存仍提交 `交易明细表_#_收货城市`。
2. `trade_detail.receive_city` 在列表、编辑、选择器和实体属性编码展示中显示为 `receive_city`，保存值仍为 `trade_detail.receive_city`。
3. 标准 `_#_`、旧版 `_#`、宽松空格 `_ # _` 中文分隔形式均取最后的字段中文名；普通名称保持原样。
4. 图谱详情中的实体属性名称同样只显示字段中文名。
5. 相关 mapper、展示工具和实体/图谱小模块测试通过，生产构建不引入当前改动错误。

## 测试要求

- 更新 `ontologyName`、维度建模、指标建模、实体属性和图谱详情相关模块单测。
- 验证展示值与提交原值隔离，覆盖标准映射、兼容分隔符、普通名称和空值。
- 执行定向 Vitest、`pnpm test`、`pnpm --filter chatbi typecheck`、`pnpm --filter chatbi build` 与 `git diff --check`。
- 更新 `.ai/runs/2026-09-02-ontology-attribute-metric-selection/RUN_LOG.md`。

---

# 本体网络属性配置与指标维度选择修复

## 文档状态

- 状态：已实现并完成自动化验证，待登录后的界面回归。
- 日期：2026-09-02。
- 当前分支：沿用当前工作分支。
- 需求来源：用户交互截图、背景回归截图与补充说明。
- 影响范围：`apps/abi/src/pages/workbench/ontology-kg/entity`、`apps/abi/src/pages/workbench/ontology-kg/label-meaning/components/metric-modeling`。

本文件是本轮开发的唯一当前需求依据。下方已完成的“标签语义表达式与指标建模改造需求”保留为历史上下文，不扩大本轮修改范围。

## 需求类型

ABI 本体网络局部交互与视觉修复。

## 目标

1. 实体定义“属性配置”中的属性分类筛选改为截图所示的按钮式交互。
2. 属性表格区域背景与抽屉内容背景一致，属性类型以维度蓝、指标绿、标签橙三色标签展示。
3. 自定义指标创建第三步补充一键全选；勾选父级维度分组时级联勾选其全部可选子维度。
4. 修复全局 `.abi-std-table` 背景规则覆盖属性表格局部背景的问题，使表头、表体和空状态均与抽屉背景一致。
5. 实体属性配置表格的“属性名称”按照指标建模的 `*#*` 映射规则展示分隔符后的字段名称。
6. “新增属性绑定”的“绑定资产”选项使用同一 `*#*` 规则展示资产名称，同时保留资产编码用于区分和搜索。

## 非目标

- 不修改后端接口、请求参数、保存协议或数据模型。
- 不修改属性新增、删除、保存及分组/资产选择逻辑。
- 不修改指标创建第一、第二步及第三步右侧分组展示、提交协议。
- 不修改其他本体网络页面、全局 Ant Design 主题或公共 Transfer/Tree 样式。
- 不修改全局 `.abi-std-table`、`.ant-table-wrapper` 或其他公共表格规则。
- 不修改属性名称接口原值、保存协议、属性编码、来源模块或绑定资产选择器的资产 ID、编码与提交值。
- 不进行与本需求无关的重构、格式化或文件整理。

## 影响范围

- 实体属性配置抽屉及其局部样式/展示映射。
- 指标创建第三步维度树的全选、父子级联选择及其局部选择工具。
- 上述两个小模块的单元测试。

## 验收标准

1. 属性分类筛选以独立按钮展示，当前分类具有清晰主色选中态；分类数量继续正确显示。
2. 全部、维度、指标、标签四类筛选行为保持不变。
3. 属性表格外层不再出现与抽屉背景割裂的白色卡片底色。
4. 属性类型列按维度蓝、指标绿、标签橙显示圆角标签；既有字段类型具备安全回退样式。
5. 指标第三步左侧支持一键选择全部尚未加入右侧的维度，也支持一键取消本次勾选。
6. 勾选父级分组时选中其全部可选子维度；取消父级时取消其全部可选子维度；已加入右侧的禁用项不受影响。
7. 单个子维度选择、穿梭到右侧、编辑态异步回显、右侧按组展示和提交数据结构无回归。
8. 属性表格局部样式优先级高于全局 `.abi-std-table` 的 `!important` 背景规则；表头、表体、空状态和固定列均使用 `--abi-card-box-draw-pop-bg`，且不影响其他表格。
9. 属性名称 `交易明细表_#_支付金额`、`交易明细表_#支付金额` 或 `交易明细表_ # _支付金额` 均显示为“支付金额”；不含映射分隔符的名称保持原样，空值继续显示 `-`。
10. 绑定资产选项中的上述映射名称同样只显示分隔符后的字段名称，括号中的资产编码和选项值保持不变；绑定当前分组选项保持原样。

## 测试要求

- 以“小模块一个单测文件”为粒度，不要求每个源码文件单独建立测试文件。
- 属性配置模块覆盖分类按钮数据、数量和属性类型三色展示映射。
- 属性配置模块补充局部 SCSS 回归断言，覆盖局部作用域、抽屉背景变量、表头与表体选择器，不新增全局样式。
- 属性配置模块覆盖标准、旧版、宽松空格 `*#*` 名称、普通名称及空值回退。
- 属性配置模块覆盖绑定资产选项的映射名称、资产编码、选项值和空分组状态。
- 指标维度选择模块覆盖全部可选叶子收集、父级级联选中/取消、禁用叶子排除和单叶子选择。
- 执行相关 Vitest、`pnpm test`、`pnpm --filter chatbi typecheck`、`pnpm --filter chatbi build`、`git diff --check`。
- 手工回归属性分类切换、属性类型标签、第三步全选/取消全选、父级/子级选择与左右穿梭。
- 创建 `.ai/runs/2026-09-02-ontology-attribute-metric-selection/RUN_LOG.md`，记录修改、验证、风险和 AI 系统更新判断。

## 回滚策略

- 属性配置视觉改动均限制在抽屉局部组件/样式，可独立恢复。
- 维度选择改动通过纯选择工具接入现有 Transfer，不改变表单协议，可独立恢复原 Tree 选择逻辑。

---

# 历史需求：标签语义表达式与指标建模改造需求（含派生指标预览）

## 文档状态

- 状态：指标建模改造、标签语义表达式新接口协议及派生指标编辑态语义数据回显已实现，待登录后真实接口回归。
- 日期：2026-08-31。
- 当前分支：`dev/zanghb-ontology-iteration`。
- 需求来源：用户确认的实施计划、交互截图、《芯智ABI\_标签语义表达式功能需求文档》V1.0，以及《指标建模\_时间范围扩展.html》交互稿。
- 影响范围：`apps/abi/src/pages/workbench/ontology-kg/label-meaning`。

本文件是本轮开发的唯一当前需求依据。原“会话分组独立页面与报告模式需求”已完成且不属于本轮范围。

## 需求类型

ABI 属性建模功能新增与前端协议适配，包含共享规则组件、标签定义 SQL 生成、指标建模表单调整和兼容迁移。

## 目标

1. 标签语义和普通派生指标 `indicatorClass === 'derived'` 共用三级表达式组件：分层 > 条件分组 > 条件。
2. 标签定义支持根据完整表达式一键生成 `CASE WHEN` SQL，并保留手工编辑与覆盖确认。
3. 原子指标映射补充聚合方式；派生指标继承原子指标来源、聚合和语义数据。
4. 指标创建调整信息顺序，新增预计算配置和派生指标统计口径。
5. 新字段在前端适配层定义并写入现有 JSON 协议；后端接口落地后只替换适配逻辑。

## 非目标

- 不修改 `derivative` 派生模板和自定义 CodeMirror 表达式。
- 不增加分层拖拽排序。
- 不新增后端数据库迁移或新依赖。
- 不改变标签语义基础信息、标签类型和现有字段选择数据源。
- 不重构第三步维度多选业务，只抽取其维度树数据供主体维度单选复用。
- 不修改 `apps/chat`、`apps/dashboard`、路由、鉴权或全局主题。

## 一、共享表达式组件

### 数据结构

- `RuleLayer`：`id`、`name`、`groups`。
- `RuleGroup`：`id`、`name`、`logicWithPrevious`、`conditions`。
- `RuleCondition`：`id`、`fieldId`、`operator`、`value`、`logicWithPrevious`。
- 首个分组和首个条件不使用 `logicWithPrevious`；后续项默认 `AND`，可切换 `AND/OR`。
- 删除中间项后，保留后一项与新前项的连接关系；删除首项后清除新首项连接符。

### 默认与命名

- 新建时默认一个“新分层”，不自动创建分组；至少保留一个分层。
- 新增分层使用“新分层 2、新分层 3……”；新增分组使用“条件分组 1、条件分组 2……”。
- 删除编号不回收；重新打开时按已有默认名称最大序号继续。
- 分层名称在整个表达式内唯一，分组名称在所属分层内唯一。
- 名称去除首尾空格后为 1～30 字，支持中文、英文字母、数字、空格、下划线、短横线和中英文圆括号；禁止引号、分号、反斜杠、换行及控制字符。

### 数量限制

- 单个表达式最多 20 个分层。
- 单个分层最多 10 个分组。
- 单个分组最多 20 条条件。
- 全部层级合计最多 100 条条件。
- 达到上限后禁用新增入口并展示明确上限提示；删除后立即恢复。

### 条件与校验

- 条件字段必选，保留“维度/度量/日期 > 表 > 字段”的现有树形选择逻辑，只允许选择叶子字段。
- 运算符支持：等于、不等于、大于、大于等于、小于、小于等于、包含、不包含、为空、不为空。
- “为空/不为空”隐藏并清空值；其余运算符要求值去空格后非空。
- 条件标识按分组内顺序显示 A、B、C……，删除后重排。
- 分层、分组删除二次确认；条件直接删除。
- 新增条件只更新表达式数据，不触发表达式完整性校验，也不自动展示或聚焦错误；完整性校验仍由“下一步”“确认”和“一键生成定义”等显式动作触发。
- 生成和保存时不静默忽略任何空层、空组或不完整条件，需定位并聚焦首个错误项。

### 视觉与交互

- 使用 ABI 的 Ant Design、UnoCSS/SCSS 和现有主题变量；字体沿用 Microsoft YaHei、PingFang SC、系统 sans-serif。
- 顶部使用分层标签和添加入口；分层内容使用安静卡片，分组使用次级边框卡片。
- 条件与分组之间使用系统主色连接线及可点击“且/或”节点形成逻辑脊柱。
- 窄抽屉允许条件行合理换行，不产生页面级横向溢出；保留可见键盘焦点。

### 兼容性

- 标签旧数据 `exp[].conditions` 读取时迁移为一个默认分组。
- 派生指标旧数据 `calcLogic.expressions[].conditions` 读取时迁移为一个默认分组。
- 保存使用新三级结构；关联字段 ID 递归收集并去重。

## 二、标签语义一键生成定义

- “标签定义”标题后增加仅图标按钮，使用 `ThunderboltOutlined`，Tooltip 和 `aria-label` 均为“一键生成定义”。
- 表达式完整前按钮禁用；完整后按页面分层顺序生成：

```sql
CASE
  WHEN (<分层1表达式>) THEN '<分层1名称>'
  WHEN (<分层2表达式>) THEN '<分层2名称>'
  ELSE NULL
END
```

- 同组条件和分组间连接分别生成 `AND/OR`，每个分组使用括号包裹。
- 包含/不包含生成 `LIKE/NOT LIKE '%值%'`；为空/不为空生成 `IS NULL/IS NOT NULL`。
- 数字字段按数值输出；其他值使用单引号并将内部单引号转义为两个单引号。
- SQL 字段使用叶子字段的来源字段名，不直接使用技术 ID；无法解析来源字段时阻止生成。
- 生成结果写入现有 `remark`，文本框始终可编辑。
- 抽屉内维护 `idle/generated/manual/stale` 状态，分别提示已生成、已手工调整和表达式已更新。
- 表达式变化不得自动覆盖标签定义。
- 已有非空定义且与本次生成结果不同，或用户手工修改后重新生成时，确认文案固定为：“重新生成将覆盖当前标签定义中的手工调整内容，是否继续？”

## 三、原子指标映射和来源信息

- 原子指标一键映射表在“语义类型”后新增“聚合方式”，复用 `AGG_METHOD_OPTIONS`，字段键为 `projectionFunc`，新行默认 `sum` 并必填。
- 每条映射字段将 `projectionFunc` 一并提交。
- 普通派生指标第二步删除可编辑“汇总依据/聚合方式”。
- 选择原子指标后，从原子指标顶层或来源字段中继承 `projectionFunc` 并写入隐藏表单值；缺失时前端回退为 `sum`。
- 原子指标选择框下方展示只读卡片：来源字段、聚合方式、所属语义数据；来源字段只使用所选原子指标的英文技术名称 `techName`，不再使用中文 `bizName`。`techName` 符合 `表名.字段名` 规则时显示最后一个 `.` 后的字段名，无 `.` 时原样显示完整值；不增加重复可编辑来源字段。
- 优先从指标列表项读取语义数据 ID，缺失时查询指标详情；随后查询对应数据语义详情并加载全部维度、度量和日期字段。
- 处理加载、空数据、失败重试和快速切换竞态。
- 切换到不同语义数据且已有业务限定条件时确认清空；切换到相同语义数据时保留。

## 四、指标创建表单

- 删除步骤内容中的“一、业务属性”“二、技术属性”“三、维度配置”顶层标题，保留步骤导航和模块标题。
- “计量单位”“数据类型”移动到基础信息最后。
- 模块顺序为：基础信息 > 管理信息 > 预计算配置 > 语义信息。
- “统计属性”更名为“预计算配置”，只保留计算频率和执行时间。

### 预计算配置

- 默认每小时第 0 分执行。
- 每小时：分钟整数 0～59。
- 每日：时间 `HH:mm`。
- 每周：周一～周日 + `HH:mm`。
- 每月：1～31 日 + `HH:mm`。
- 实时显示“预计每小时第 00 分钟执行一次指标预计算”等摘要，并提示“按当前空间时区执行”。
- `PrecomputeConfig` 为按频率区分的联合类型，保存 `minute/time/weekday/monthDay`。
- 写入 `calcLogic.precomputeConfig`，同时继续映射现有顶层 `updateFrequency`；旧数据缺失时使用默认值。

## 五、派生指标统计口径和业务限定

- 在普通派生指标第二步的业务限定表达式上方增加“统计口径”。
- 日期范围左侧为受 Form 管理的方式下拉框，支持 `recent/previous_full/today/yesterday/this_week/last_week/this_month/last_month/this_quarter/last_quarter/this_year/last_year` 共 12 种方式。
- 新建默认“最近 7 日”；旧数据缺少 `dateRangeMode` 时迁移为 `recent`，并保留旧数量和单位。
- 只有“最近”和“前”显示“方式 + 数量 + 单位”三段 Compact 控件；其他自然周期只显示铺满宽度的方式下拉框。隐藏的数量和单位保留在表单及协议中，但不参与业务含义和校验。
- “最近”支持小时、日、周、月、季度、年；“前”支持日、周、月、季度、年。从“最近 + 小时”切换到“前”时，单位自动调整为“日”，其他合法数量和单位保留。
- 数量必须为 1～999 的整数；空值提示“请输入统计窗口数量。”，校验提示“请输入 1 至 999 的正整数”。数量输入框仍由外层 `Form.Item` 直接受控，确保组合布局下取值、校验、保存和回显正确。
- 日期范围提示和预览摘要必须随方式、数量和单位实时变化；“前 N 日”摘要显示“前 N 天”，其他单位显示“前 N 个完整周/月/季度/年”。
- Compact 控件使用局部 CSS Module 恢复三段圆角、等高和响应式，不修改全局表单样式。
- 时段范围默认全天；指定时段显示开始和结束 `HH:mm`，要求开始时间早于结束时间。
- 主体维度必选，复用第三步维度树数据源，使用单选 `TreeSelect`；与第三步多选互不自动同步。
- `StatisticalCaliber` 保存 `dateRangeMode/dateRangeValue/dateRangeUnit/timeRangeType/startTime/endTime/subjectDimensionId`，其中 `dateRangeUnit` 增加 `quarter/year`。
- 写入 `calcLogic.statisticalCaliber`，旧数据缺失时使用默认日期和时段值，主体维度仍由用户选择。
- 业务限定使用共享三级表达式组件；字段来自选中原子指标所属数据语义。
- 新结构写入 `calcLogic.expressions[].groups[]`，解析器兼容旧 `conditions`。
- 现有预览继续保留，使用继承的聚合方式和新嵌套条件生成。

## 接口与适配边界

- 不新增裸 `fetch/axios`，继续使用 ABI 现有 service request 和 API 函数。
- ID 保持 `string | number`，不得强制转换为 number。
- 原子指标聚合方式优先使用后端 `projectionFunc`；前端默认 `sum` 仅作为后端字段缺失时的兼容值。
- `calcLogic` 新字段为前端先行协议；后端正式字段确认后只调整 mapper，不改 UI 组件结构。

## 六、普通派生指标预览

- 仅将普通派生指标 `indicatorClass === 'derived'` 第二步的“派生逻辑生成结果”改为“指标预览”，不修改派生模板 `derivative`。
- 删除原摘要标签和单块虚线预览，使用两张纵向卡片展示“公式预览”和“SQL Preview”。
- 公式预览实时展示指标名称、计算基础、统计范围、主体维度、统计维度和配置表达式；字段未配置或条件不完整时显示明确占位。
- 配置表达式保留全部分层、条件分组、条件及其“且/或”关系，多个分层沿用现有跨分层 AND 语义。
- SQL Preview 使用原子指标继承的聚合方式，并优先按所选原子指标 `techName` 的最后一个 `.` 拆分来源表和英文来源字段：如 `trade_fact.payment_amount` 生成 `SELECT SUM(payment_amount) FROM trade_fact`；无 `.` 时字段和 `FROM` 来源均原样展示完整 `techName`。主体维度和第三步统计维度去重后生成 `GROUP BY`。
- 来源元数据缺失时显示带“待接口返回”说明的来源字段或来源表占位，不以原子指标中文名称伪装技术字段。
- `WHERE` 只展示可生成的业务限定条件；本轮不生成日期范围或时段范围 SQL，不完整条件不生成无效 SQL。
- 完整展示 SQL 仅供界面预览。表单 `expr`、`derivedConditionExpr` 及 `calcLogic` 提交协议必须保持改造前行为。
- 样式使用局部 CSS Module，遵循交互稿的白色外层模块、纵向卡片、深色业务文案及可横向滚动的等宽蓝色 SQL 区域，不修改全局样式。

## 七、指标建模接口联调协议

### 顶层计算频率

- 表单内部继续使用 `PrecomputeConfig`，提交顶层 `updateFrequency` 改为对象：`frequency/minute/day_of_week/day_of_month`。
- 每小时的 `minute` 为 0～59 的字符串；每日、每周、每月的 `minute` 为 `HH:mm`。
- 每周仅 `day_of_week` 为 1～7，其余日期字段显式传 `null`；每月仅 `day_of_month` 为 1～31，其余日期字段显式传 `null`。
- 编辑优先读取新对象，兼容旧顶层频率字符串和 `calcLogic.precomputeConfig`；保存继续双写旧 `calcLogic.precomputeConfig`。

### 普通派生指标统计周期

- `calcLogic.calcPeriod` 写入 `date_range` 和 `time_range`。
- 表单的 `previous_full` 映射 API `previous`，`this_week/month/quarter/year` 映射 `current_week/month/quarter/year`，其他日期方式保持英文值。
- 仅 `recent/previous` 传 `value/unit`，固定周期显式传 `null`。
- 全天映射 `all_day` 并显式传空起止时间；指定时段映射 `custom` 并传 `start_time/end_time`。
- 新 `calcPeriod` 优先回显，缺失时回退旧 `statisticalCaliber`。
- 主体维度写入 `calcLogic.subjectDimension = { dim_id, dim_name }` 并优先回显；`dim_id` 为维度 ID，`dim_name` 为维度名称，同时保留旧 `statisticalCaliber.subjectDimensionId`。

### 普通派生指标模板表达式

- `calcLogic.indicator_templates.layers` 保存分层，`layerName` 为分层名，`sortOrder` 从 1 连续递增。
- 每个条件分组映射为 `expressions`，包含 `expressionId/name/innerLogic/conditions`；层内统一逻辑写入 `groupLogic`。
- 条件继续选择语义字段：`conditionId` 为字段 ID，`field` 为英文技术字段名，`fieldName` 为中文展示名。
- 运算符映射为 `EQ/NE/GT/GE/LT/LE/IN/NOT_IN/NULL/NOT_NULL`；空值运算符不提交比较值，包含类值继续传单个字符串。
- 新模板结构优先回显，旧 `calcLogic.expressions` 继续读写；衍生模板 `derivative` 的既有 `indicator_templates` 协议不变。

### 统一逻辑和历史兼容

- 公共表达式组件通过可选模式支持统一逻辑；普通派生指标和采用同协议后的标签语义均启用该模式。
- 切换任一组间连接符时同步当前层全部组间连接符，切换条件连接符时同步当前分组全部条件连接符；新增项继承当前层级逻辑。
- 历史混合逻辑原样回显，不自动改变语义；下一步或保存时阻止提交并定位首个不一致项，用户切换任一对应连接符后完成统一。
- 保存双写新 `calcPeriod/indicator_templates/subjectDimension` 与旧 `statisticalCaliber/expressions/precomputeConfig`；冲突时新协议优先回显。

## 八、指标创建第三步滚动

- 第三步维度配置的左右穿梭列表保持现有固定高度，列表头固定在容器内。
- 左侧维度树和右侧已选维度列表内容超过可视高度时，各自在内容区纵向滚动，不再穿透列表边框或撑高抽屉。
- 右侧已选维度按接口返回的维度分组展示，避免不同分组下的同名维度无法区分；已失效且无法匹配分组的历史维度归入“未分组”。
- 新增和编辑回显使用同一套分组逻辑；组件监听表单中的维度值，异步回填编辑详情后也要同步所选项并重新归组。
- 使用 `DimensionStep` 的局部 CSS Module 修复 Ant Design 自定义 Transfer body 的 flex/overflow，不修改全局 Transfer、抽屉或其他表单样式。
- 保留现有穿梭选择、禁用、计数、标题省略和提交逻辑。

## 九、标签语义表达式接口协议

- 标签语义接口继续使用现有顶层 `exp` 字段，不新增 `calcLogic` 或 `indicator_templates` 顶层参数。
- `exp` 从旧版 URI 编码数组字符串改为对象，并与普通派生指标 `calcLogic.indicator_templates` 使用相同的 `{ layers }` 结构。
- 分层提交 `layerName/sortOrder/groupLogic/expressions`；条件分组提交 `expressionId/name/innerLogic/conditions`。
- 条件提交 `conditionId/field/fieldName/operator/operatorName/value`：`conditionId` 为语义字段 ID，`field` 为英文来源字段名，`fieldName` 为页面展示名称；空值运算符不提交 `value`。
- 运算符统一映射为 `EQ/NE/GT/GE/LT/LE/IN/NOT_IN/NULL/NOT_NULL`。
- 标签编辑优先解析新的 `{ layers }` 对象，同时兼容新结构 JSON 字符串、旧 URI 编码 `binName/groups/metric` 结构和旧分层直含条件结构。
- 因新协议仅提供统一的 `groupLogic/innerLogic`，标签语义同步启用层内和组内统一逻辑；历史混合逻辑原样回显但保存前必须统一，避免静默改变表达式含义。
- 标签关联字段 ID 继续从回显后的规则树递归收集并去重；标签定义 SQL、语义字段选择和其他基础信息协议不变。

## 十、派生指标编辑态所属语义数据回显

- 编辑普通派生指标时，来源卡片中的“所属语义数据”必须从当前回填并选中的原子指标元数据解析，不能依赖派生指标自身的语义数据字段。
- 名称优先使用原子指标明确返回的 `relSchemaName/semanticSchemaName/schemaName/semanticName`；缺失时从原子指标来源字段的 `rtableName/tableBizName` 或一键映射业务名称中 `_#_` 前的语义数据名称回退。
- 打开历史派生指标后仍按现有逻辑加载原子指标详情和语义数据详情；异步补全结果需更新同一个原子指标选项，使来源字段、聚合方式和所属语义数据三项保持同源。
- 新增派生指标、手工切换原子指标、语义字段树加载及提交协议保持不变。

## 验收标准

1. 标签语义和普通派生指标展示同一套三级嵌套交互，名称、数量、逻辑和完整性规则一致。
2. 标签完整表达式可生成正确 CASE WHEN SQL；生成后可编辑，表达式变化不覆盖，重新生成按规则确认。
3. 旧标签和旧派生指标表达式能够读取、编辑并按新结构保存。
4. 原子指标映射可配置聚合方式；派生指标选择后正确展示来源卡片并继承聚合方式。
5. 派生指标字段树来自原子指标所属数据语义，层级和标签语义一致。
6. 指标创建模块顺序、标题、计量单位和数据类型位置符合要求。
7. 四种预计算频率动态控件、校验和说明文案正确，并能保存和回显。
8. 统计口径能够保存和回显，主体维度单选与第三步维度树同源。
9. 12 种日期范围方式的动态控件、提示和预览摘要正确；“前”不允许小时，数量仅在动态方式下校验为 1～999。
10. `derivative`、自定义指标、第三步维度多选和标签基础信息无回归。
11. 桌面和窄抽屉下无页面级横向溢出，连接线、逻辑节点和键盘焦点清晰。
12. 普通派生指标预览完整展示六项业务信息和实际元数据 SQL；切换原子指标、统计口径、条件和维度后能够实时更新，且提交协议不变。
13. 四种顶层 `updateFrequency` 对象字段、字符串与显式空值符合接口协议，并可兼容旧频率数据回显。
14. 普通派生指标新 `calcPeriod`、`subjectDimension` 与 `indicator_templates.layers` 能够保存、编辑回显，并与旧字段双写且以新协议优先。
15. 派生指标和标签语义的层内、组内连接符保持统一，历史混合逻辑不会被静默修改，需由用户统一后保存。
16. 指标创建第三步左右列表内容超出固定高度后分别出现纵向滚动，内容不越过列表底部边框；右侧按维度分组展示已选字段。
17. 标签语义新增和编辑提交的 `exp` 为与派生指标一致的 `{ layers }` 对象，字段元数据、运算符和逻辑正确；旧标签表达式仍可编辑回显并在保存后迁移为新协议。
18. 编辑普通派生指标时，选中原子指标后来源卡片能够显示该原子指标所属语义数据；接口名称缺失时可从原子指标来源元数据稳定回退，不显示错误的派生指标自身名称。

## 测试要求

- 优先运行与 chat 和 ABI 相关的类型检查、测试或构建命令；如项目门禁本身不可用，需说明原因。
- 对受影响文件进行代码级回归检查。
- 为表达式规范化、完整性、名称与上限校验、连接关系、SQL 生成和字段 ID 收集补 Vitest。
- 为 `calcLogic` 新结构、旧结构迁移、预计算配置和统计口径往返补 Vitest。
- 为原子指标元数据和聚合方式回退补 mapper 测试。
- 为派生指标预览补充纯函数测试，覆盖公式六项内容、混合逻辑、来源元数据、维度去重、空值回退、无效条件和展示/提交表达式隔离。
- 为原子指标 `techName` 的 `表名.字段名` 拆分、无 `.` 原样回退、来源卡片英文显示和 SQL 首行生成补充单元测试。
- 为四种 `updateFrequency`、12 种日期方式、两种时段方式、新旧优先级和显式 `null` 补适配器单元测试。
- 为 `indicator_templates.layers` 多层、多组、10 种运算符、字段元数据、数组回显兼容及新旧往返补单元测试。
- 为统一逻辑联动、继承、混合逻辑校验和标签语义非统一模式补组件测试。
- 为原子指标所属语义数据名称的显式字段、来源字段元数据、一键映射名称和空值回退补适配器单元测试。
- 为 12 种日期范围方式的提示、摘要、单位白名单、旧协议迁移和新协议往返补 Vitest；组件测试覆盖动态/自然周期渲染、非法小时单位回退和数量校验。
- 手工回归标签新增/编辑、原子映射、普通派生指标新增/编辑、第三步维度和其他指标类型。
- 执行：
  - `pnpm test`
  - `pnpm --filter chatbi typecheck`
  - `pnpm --filter chatbi build`
  - `git diff --check`
- 本轮接口联调完成后创建 `.ai/runs/2026-08-26-indicator-api-integration/RUN_LOG.md`，记录修改、验证、风险、接口待办和 AI 系统更新判断；界面回归截图不保存到项目。
- 完成后生成 run log，记录修改、验证、风险和是否需要更新 `.ai/` 长期文档。

## 回滚策略

- 共享组件通过标签和派生指标两个适配器接入；出现问题可分别恢复旧渲染而不影响 API 服务层。
- 新 `calcLogic` 字段均为附加 JSON，旧字段解析继续保留；回滚 UI 不需要数据库迁移。

## 2026-07-16 追加：图谱筛选列表搜索与折叠

### 目标

- 实体筛选和关系筛选标题后分别增加名称搜索框，仅过滤对应筛选项。
- 实体筛选和关系筛选的名称搜索框均使用 300ms 防抖后再执行本地过滤。
- 两类筛选项默认展示前 5 条，超过 5 条时展示“点击查看更多”。
- 展开后保持筛选区域高度稳定，通过局部滚动展示全部匹配项，并将操作文案改为“收起更多内容”。
- 保持现有全选、半选和图谱本地过滤行为不变。

### 非目标

- 不修改图谱查询接口、查询参数和 X6 画布逻辑。
- 不修改实体、关系配置及属性建模模块。
- 不引入全局样式。

### 验收标准

- 实体名称搜索与关系名称搜索互不影响，空关键词恢复完整列表。
- 实体名称搜索与关系名称搜索输入后 300ms 再更新筛选结果。
- 选项不超过 5 条时不展示展开文案；超过 5 条默认仅显示 5 条。
- 展开后列表容器高度不增长，可滚动查看全部匹配项；收起后恢复前 5 条。
- 构建和相关测试通过，不覆盖既有改动。

## 2026-07-16 追加：全系统批量删除按钮危险态统一

### 目标

- 全系统所有列表的批量删除按钮在未选择数据时继续保持禁用灰色。
- 选择数据、按钮可用后，统一展示为与本体网络一致的红色危险按钮。
- 所有批量删除按钮统一在文案前展示删除图标。
- 选中数据后，按钮文案统一追加当前选中数量，如“批量删除(2)”。
- 所有批量删除按钮文案统一为“批量删除”，不再使用“批量删除数据”“批量取消授权”等变体。

### 非目标

- 不修改列表选择、删除确认、接口调用及删除结果处理逻辑。
- 不修改单条删除按钮和其他普通操作按钮样式。

### 验收标准

- 所有包含批量删除操作的列表按钮均具备 `danger` 外观。
- 所有批量删除按钮均具备删除图标，且文案统一为“批量删除”。
- 所有批量删除按钮均在选中数据后展示选中数量。
- 原有 `disabled` 条件和点击事件保持不变。
- 批量删除按钮不再被普通幽灵按钮或主按钮样式覆盖危险色。

## 2026-07-16 追加：ABI 列表切卡片清空批量选中态

### 目标

- ABI 应用中所有支持列表/卡片视图切换的列表页，在从列表切换到卡片视图或切换视图时清空表格选中数据。
- 避免切到卡片视图后批量删除按钮仍因旧的 `selectedRowKeys` / `checkedRowKeys` 可点击。
- 保持原有批量删除接口、确认弹窗和列表数据逻辑不变。

### 非目标

- 不修改单条删除、分页、搜索、接口请求逻辑。
- 不修改非 ABI 应用。
- 不重构表格/卡片组件布局样式。

### 验收标准

- ABI 中所有包含批量删除和列表/卡片切换的页面，切换到卡片视图后批量删除按钮不可点击。
- 切回列表后需要重新选择数据才能执行批量删除。
- 没有批量选择能力的视图切换页面不受影响。

## 2026-07-16 追加：属性建模维度时间维配置调整

### 目标

- 时间维的时间粒度枚举调整为：年/year、半年/half_year、年季/quarter、年月/month、年周/week、年月日/day。
- 维度新增/编辑基础信息中删除独立的时间字段、时间格式表单项。
- 时间格式改为关联字段表格列，默认值为 `yyyy-MM-dd`，并随对应关联字段一起提交给后端。
- 关联字段表格固定高度，内容超出后内部滚动。
- 时间维层级配置删除快捷生成时间层级入口和相关自动生成逻辑，左侧改为展示已选时间粒度并支持拖拽生成层级结构。

### 非目标

- 不调整维度列表、分组、预览数据、相关指标逻辑。
- 不修改层级编辑接口协议。
- 不运行构建或完整测试，只做静态路径和关键逻辑检查。

### 验收标准

- 时间维基础信息只保留时间粒度，不再出现时间字段、时间格式两个独立字段。
- 关联字段表格在时间维下展示时间格式列，且保存时每个关联字段对象包含 `timeFormat`。
- 层级配置弹窗不再出现“快捷生成时间层级”及生成按钮。
- 时间维层级配置左侧显示时间粒度选项，而不是关联字段。

## 2026-07-17 追加：会话消息导航条（千问式定位）

### 需求类型

前端交互功能新增（纯前端）。

### 背景

参考千问对话界面：在会话区右侧提供一条消息导航条（minimap），支持快速定位到历史提问。

### 目标

- 在 chat 会话区右侧新增贴边导航条，每根横杠对应一轮用户提问（不含 AI 回答）。
- 默认低透明度；鼠标进入导航区域时整体提亮，并在其左侧弹出问题预览列表（截断问题文本）。
- 预览项与横杠一一对应，hover 某项高亮对应横杠，点击平滑滚动定位到该条用户消息。
- 跟随滚动实时高亮当前所在轮次。

### 非目标

- 不改动消息渲染、批量删除、重新生成、分享等既有逻辑。
- 不涉及后端接口。
- 不接入虚拟列表（`virtualized`）分支。

### 影响范围预期

- 新增：`apps/chat/src/components/conversation/components/MessageNavRail.tsx`
- 修改：`apps/chat/src/components/conversation/components/MessageList.tsx`
- 新增 run log：`.ai/runs/2026-07-17-message-nav-rail/`

### 验收标准

- 多轮对话右侧出现横杠，数量等于用户提问轮数；单轮对话与分享模式不显示。
- 悬停弹出预览列表，问题文本正确截断。
- 点击横杠或预览项平滑定位到对应用户消息。
- 上下滚动时当前横杠/预览项高亮实时跟随。
- 批量删除、重新生成版本切换、发送后自动滚底等既有行为不受影响。

## 2026-07-22 追加：ABI 列表页搜索栏统一为「输入框 + 高级筛选」

### 需求类型

前端 UI 统一重构（纯前端，不改接口协议）。

### 背景

用户要求将 ABI 应用中「主页更多空间、工作台、组件」下所有列表页的搜索栏统一为：搜索输入框占满一行自适应 + 右侧「高级筛选」按钮（风格参考图谱探索工具栏按钮，但增加文字）。除搜索输入框外的其他筛选项（下拉、时间范围）全部收进高级筛选弹出面板，面板内一行两个筛选项，底部为重置/查询按钮（参考图谱探索的高级搜索面板）。开始时间/结束时间独立选择改为单个时间范围 RangePicker（日期精确到天，弹出双日历面板，不再出现时间列）。

### 目标

- 新增共享组件 `SearchFilterBar`（搜索行 + 高级筛选 Popover 面板）。
- 改造页面：space-list、app-workshop(my-collect/my-share/recently-used)、assistant-config、data-collection、data-source、data-table-meaning、job(time/log/email)、ontology-kg(relation/entity/technical-jargon/recommended-inquiries/label-meaning 两个搜索栏)、component(api-key/data-dictionary/effect-review/model/plugin/skills/tools)。
- 时间范围统一为 `RangePicker`（format YYYY-MM-DD，无 showTime）；对需要提交时间的接口按 startOf('day')/endOf('day') 映射，保持查询语义。

### 非目标

- 不改造大屏（screen-manage）与本体网络图谱探索（kggraph）。
- 不修改 manage/、space/ 等门户管理页面。
- 不修改后端接口、查询参数含义、表格/分页逻辑。
- 不改造抽屉/弹窗内部的次级搜索。

### 验收标准

- 各页面搜索行为一行：输入框自适应占满剩余宽度 + 高级筛选按钮（漏斗图标+文字）。
- 高级筛选面板筛选项一行两个，底部重置/查询，交互与原查询/重置一致。
- 时间范围为单控件双日历，精确到天。
- 类型检查/构建不引入新错误。

## 2026-07-23 追加：搜索输入框停止输入自动查询（防抖，去回车）

### 需求类型

前端交互调整（纯前端，不改接口协议）。

### 背景

用户要求 ABI 项目所有搜索输入框改为：停止输入 2s 后自动发起查询接口，不再需要回车触发。

### 目标

- 共享搜索栏 `SearchFilterBar`（abi 与 dashboard 两份）默认输入框停止输入 2s 后自动查询。
- 使用自定义 `searchSlot` 输入框的页面（api-key、job/email、job/time、job/log、effect-review、ontology-kg/entity）同样具备停止输入 2s 后自动查询。
- 保留回车立即查询（并取消未触发的防抖定时器，避免重复请求）。
- 清空输入框（allowClear 或删空）时立即查询，不等待 2s。
- 高级筛选面板内的下拉/时间范围仍仅在点击「查询」时生效，不参与自动查询。

### 非目标

- 不修改查询接口、查询参数含义、分页与表格逻辑。
- 不改造抽屉/弹窗内部次级搜索。
- 不改造大屏图谱探索（kggraph）等未使用统一搜索栏的输入。

### 影响范围

- `apps/abi/src/components/SearchFilterBar.tsx`
- `apps/dashboard/src/pages/home/project-list/SearchFilterBar.tsx`
- `apps/abi/src/pages/component/applications/api-key/index.tsx`
- `apps/abi/src/pages/workbench/job/{email,time,log}/index.tsx`
- `apps/abi/src/pages/component/data/effect-review/index.tsx`
- `apps/abi/src/pages/workbench/ontology-kg/entity/components/EntitySearch.tsx`
- `.ai/runs/2026-07-23-search-input-debounce/`

### 验收标准

- 各搜索输入框停止输入约 2s 后自动发起查询，无需回车。
- 回车仍可立即查询；清空输入框立即查询。
- 高级筛选下拉/时间选择不触发自动查询，仍由「查询」按钮生效。
- 类型检查不引入新错误（沿用仓库既有 pre-existing 报错）。

## 2026-07-28 追加：ABI 外层大背景与毛玻璃侧边栏对齐 chat

### 需求类型

前端样式微调（纯 CSS，不改逻辑）。

### 背景

chat 应用外层 Layout 有一层大背景渐变（#d5daf5 → #dfe6f8 → #e2d9f3），侧边栏为半透明毛玻璃透出该背景；ABI 没有这层外层背景，侧边栏为不透明 `--abi-card-bg`。用户要求给 ABI 也加上这层外层大背景，使两应用侧边栏视觉一致。

### 目标

- ABI `body` 增加与 chat 一致的外层大背景渐变。
- ABI 左侧 72px 导航栏保持半透明毛玻璃（透出 body 渐变），背景声明需 `!important` 压住 antd Sider 默认背景。

### 非目标

- 不修改各页面内容区的 `--abi-card-bg` 不透明底色。
- 不修改卡片/抽屉/弹窗背景。

### 验收标准

- ABI 侧边栏透出蓝紫渐变，视觉与 chat 侧边栏一致。
- 内容区、卡片、弹窗等其他区域视觉不变。

## 2026-07-29 追加：dashboard 微应用样式隔离

### 需求类型

前端缺陷修复与微前端样式治理。

### 背景

dashboard 作为 qiankun 微应用挂载到 ABI 时，dashboard 全局 `html/body` 背景样式会覆盖宿主 ABI 的 `body` 背景，导致 ABI 半透明 global-sider 在进入「工作台 > 应用工坊 > 我的大屏」后视觉发生变化。

### 目标

- ABI 加载 dashboard 微应用时启用 qiankun 样式隔离。
- dashboard 背景从全局 `html/body` 挪到 dashboard 自身应用根节点，避免污染宿主页面。
- 将“以后生成或接入微应用必须隔离样式，禁止子应用全局 body/html 背景污染宿主”的规则写入 `.ai` 长期文档。

### 非目标

- 不修改 dashboard 业务页面、设计器逻辑和接口逻辑。
- 不修改 ABI global-sider 当前视觉参数。
- 不引入新的微前端框架或大范围样式重构。

### 验收标准

- 进入 dashboard 微应用页面后，dashboard 样式不会覆盖 ABI 宿主 `body` 背景。
- dashboard standalone 运行时仍保留自身页面背景。
- 后续 AI/开发者在新增微应用时能从 `.ai` 文档看到样式隔离要求。

## 2026-07-29 追加：ABI global-sider 背景固定为不透明色

### 需求类型

前端样式微调（纯 CSS，不改逻辑）。

### 背景

ABI 72px global-sider 使用 `rgba(255, 255, 255, 0.38)` 半透明背景时，视觉颜色会受宿主 body 背景、微应用样式污染或页面背景变化影响。用户要求撤回布局层透明化方案，改为将 global-sider 背景固定成不透明十六进制颜色，确保颜色不再随底层背景变化。

### 目标

- 撤回上一轮 ABI 布局外壳、二级菜单、内容区透明化改动。
- 将 `apps/abi/src/layouts/modules/global-sider/index.scss` 中 `.abi-nav-sider` 背景从透明 rgba 改为不透明 hex。
- 保留原有内容区、二级菜单、卡片、抽屉、弹窗背景逻辑。

### 非目标

- 不修改动态 router 目录。
- 不修改 dashboard 子应用业务逻辑。
- 不重构菜单数据、权限、路由跳转逻辑。
- 不继续调整二级菜单和页面内容区背景。

### 验收标准

- `.abi-nav-sider` 使用不透明十六进制背景色，不再依赖底层背景混色。
- 上一轮 `global-content`、`global-menu`、`manage-menu`、`global.css` 的布局透明化改动已撤回。
- 修改不引入格式错误。

## 2026-07-30 追加：数据集 SQL 模式保存参数对接（后端口径）

### 需求类型

前端接口对接（保存参数改造），无 UI 变化。

### 背景（后端确认的存储口径）

- 快速模式 `viewType='union'`，SQL 模式 `viewType='sql'`；新增调 `addDataSet`，编辑调 `saveDataSet`。
- SQL 模式不传 `allFields`。
- SQL 原文仍由后端从 `union[0].currentDs.tableInfo.sql` 提取（union 假节点结构不变）；`unionSql` 保持原样（union 的序列化）。
- 新增参数 `viewHistory`（字段名经两次调整：unionSql → viewInfo → viewHistory）：存「选择表」抽屉勾选的表结构（平铺数组，每表一个 `currentDs` + `currentDsFields`，格式对齐快速创建的 union）。
- 勾选记录的保存/回显由此顺带解决，无需单独接口。

### 目标

- `saveSql`：新增 `viewHistory` 参数存勾选表结构 JSON；`unionSql`/`union` 保持原样；去掉 `allFields`；新增/编辑按 id 分流 `addDataSet`/`saveDataSet`。
- 勾选状态从 SqlModeEditor 提升到 `[id].tsx` 页面级（受控 props），保存时可取。
- 抽屉勾选模型升级为字段对象数组（`Record<tableName, {originName, comment}[]>`），保存时直接组装 `currentDsFields`。
- 编辑回显：详情接口 `viewHistory` 解析→抽屉勾选状态；无效/假节点跳过不回显。
- 切换数据源时清空勾选。

### 非目标

- 不改抽屉 UI 交互、不改快速模式保存逻辑、不动 AI 生成 SQL 功能。

### 验收标准

- SQL 模式保存报文：无 `allFields`；新增 `viewHistory` 为勾选表结构 JSON；`unionSql`/`union` 与改前一致；新增走 addDataSet。
- 编辑已保存的 SQL 数据集，抽屉勾选正确回显。
- tsc 不新增报错。

## 2026-08-04 追加：效果评审模型评估双报错与超时修复

### 需求类型

前端缺陷修复（报错提示去重 + 请求超时调整）。

### 背景

效果评审「人工评估」抽屉中的「AI评估」调用 llmeval 接口：
1. 接口报错时前端同时弹两条提示（请求层统一报错 + 抽屉里额外补的 `message.error`），且超时报错与“模型评估失败”叠加；
2. llmeval 后端耗时较长，超过默认 30s axios 超时，每次都触发超时报错。

### 目标

- 模型评估失败时只弹出一条提示：移除抽屉内重复的 `message.error`，报错统一由请求层弹出。
- 请求层后端业务报错兼容旧接口的 `err_msg` 字段作为 `msg` 兜底，保证弹出的唯一提示是真实错误内容。
- `fetchModelEval` 单独放宽超时至 3 分钟。
- AI 评估成功后优先使用 llmeval 接口直接返回的 `eval_llm` / `llm_opinion` 展示结果，避免二次查询详情导致数据不一致或延迟。

### 非目标

- 不修改其他接口的超时与报错逻辑（仅新增 `err_msg` 兜底，`msg` 优先级不变）。
- 不修改模型评估成功后的详情回查与结果展示逻辑。

### 影响范围预期

- `apps/abi/src/pages/component/data/effect-review/modules/effect-review-operate-drawer.tsx`
- `apps/abi/src/service/request/error.ts`
- `apps/abi/src/service/api/assistant-manage.ts`
- `.ai/runs/2026-08-04-model-eval-error-and-timeout/`

### 验收标准

- AI 评估接口失败（业务错误/超时）时仅弹出一条提示，不再出现两条叠加。
- 模型评估正常耗时（>30s）不再触发前端超时；3 分钟内返回可正常展示评估结果。
- tsc 不新增报错。

## 2026-08-04 追加：邮件记录简化状态 displayGroup 展示与筛选

### 需求类型

前端接口字段对接 + UI 调整。

### 背景

邮件列表接口 `/shared/list` 返回数据新增 `displayGroup` 字段，记录简化状态（4 类：处理中 / 已生成 / 成功 / 失败）。原始状态 7 类：-1 已删除、0 待处理、1 生成日报中、2 日报已生成、3 已发送、4 发送失败、5 文件生成失败。映射关系：0、1→处理中；2→已生成；3→成功；4、5→失败。

### 目标

- 邮件记录列表/卡片状态列展示 `displayGroup` 简化状态（处理中/已生成/成功/失败）。
- 点击状态可看全部状态详情（Popover：原始状态文案 + 发送时间，发送失败附 reject 原因）。
- 高级筛选「任务状态」下拉改为 4 类简化状态，基于 displayGroup 前端过滤（与时间范围同为前端筛选）。
- `displayGroup` 兼容中文文案或 1~4 数字；缺失时按原始 status 推导兜底。

### 非目标

- 不修改后端接口与查询参数协议。
- 不改动下载、删除等其他操作逻辑。

### 影响范围预期

- `apps/abi/src/types/job.ts`
- `apps/abi/src/pages/workbench/job/email/index.tsx`
- `.ai/runs/2026-08-04-email-display-group-status/`

### 验收标准

- 状态列展示 4 类简化状态，点击弹出「状态详情」显示原始状态与时间。
- 任务状态筛选下拉为 4 类，筛选/重置生效。
- tsc 不新增报错。

## 2026-08-04 追加：邮件记录任务状态筛选改为点击查询才生效

### 需求类型

前端交互缺陷修复（纯前端，不改接口协议）。

### 背景

邮件记录页高级筛选的「任务状态」下拉使用普通 `ASelect`，选中选项后立即触发前端过滤；与「高级筛选下拉控件延迟生效规范」不符（应仅在点击「查询」时生效，与时间范围 `DeferredRangePicker` 行为一致）。

### 目标

- 「任务状态」下拉改用 `DeferredSelect`：选中时仅更新草稿值，点击「查询」按钮才提交并过滤列表；点击「重置」清空草稿与已生效值。

### 非目标

- 不修改时间范围筛选、任务名称搜索、分页与列表渲染逻辑。
- 不修改 `SearchFilterBar` 共享组件本身。

### 影响范围预期

- `apps/abi/src/pages/workbench/job/email/index.tsx`
- `.ai/runs/2026-08-04-email-status-filter-deferred/`

### 验收标准

- 邮件记录高级筛选选择任务状态后列表不立即变化，点击「查询」后才按状态过滤。
- 点击「重置」后状态筛选与时间范围均清空并恢复全量列表。
- tsc 不新增报错。

## 2026-08-05 追加：MCP 编辑页 bearer 模式自动使用平台 token

### 需求类型

前端交互调整（纯前端，不改接口协议）。

### 背景

MCP 服务编辑页「安全认证方案」中，当认证类型为 HTTP 且 Scheme 选择 bearer 时，需要手动在「默认凭证」输入框填写 token。用户要求改为自动使用当前平台登录 token，无需手动填写。

### 目标

- MCP 编辑页中，安全认证方案的类型为 `http` 且 scheme 为 `bearer` 时，「默认凭证」自动填充为当前平台的 Authorization header（格式 `Bearer ${token}`）。
- bearer 模式下「默认凭证」仍允许手动修改；未手动修改时默认使用平台当前 token。
- 提交保存时，bearer 方案将当前 `defaultCredential` 值传给接口。

### 非目标

- 不修改 basic、apiKey 等其他认证模式的凭证填写方式。
- 不修改安全认证方案的其他字段（ID、认证类型、scheme 选项）。
- 不修改 MCP 列表、详情、删除、状态切换逻辑。
- 不修改后端接口协议。

### 影响范围预期

- `apps/abi/src/pages/component/system/plugin/components/SecuritySchemeSection.tsx`
- `apps/abi/src/pages/component/system/plugin/components/PlugUpdate.tsx`
- `.ai/runs/2026-08-05-mcp-bearer-token-auto-fill/`

### 验收标准

- 新增/编辑 MCP 服务时，只要安全认证 scheme 为 bearer，「默认凭证」自动显示为当前平台 `Bearer xxx`，且允许手动修改。
- 从 basic 切换到 bearer 时，「默认凭证」自动填充当前平台 token。
- 编辑回显已有 bearer 方案时，defaultCredential 自动同步为当前平台 token。
- 提交报文中 bearer 方案的 `defaultCredential` 为当前平台 Authorization header。
- tsc 不新增报错。

## 2026-08-10 追加：ABI 登录失效后可靠跳转登录页

### 需求类型

前端鉴权缺陷修复（401 去重状态与登录跳转兜底）。

### 背景

ABI 页面在账号被其他环境顶掉后，自动请求会返回 401 并显示“登录已过期，即将前往登录页”提示，但延迟结束后偶发没有实际进入登录页。首次处理已经把全局鉴权状态置为处理中，后续接口继续返回 401 时也不会再次触发跳转。

### 目标

- 保持并发多个 401 只提示和处理一次。
- 登录失效延迟结束后使用可靠的浏览器级导航进入 `/login`，并保留安全的当前页面 redirect 参数。
- 登录跳转回调失败时释放共享鉴权的处理中状态，允许后续 401 重新发起跳转。
- 为共享鉴权补充并发去重和跳转失败重试测试。

### 非目标

- 不修改 `apps/abi/src/router` 动态路由及路由生成文件。
- 不修改登录接口、权限路由初始化、401 提示文案和延迟时长。
- 不调整 chat、dashboard 的应用级登录跳转实现。

### 验收标准

- 首次 401 只显示一次失效提示，并在既有延迟后进入 `/login`。
- 同一批并发 401 不会重复提示或重复跳转。
- 一次跳转执行失败不会永久锁住鉴权流程，后续 401 可再次处理。
- 定向 Vitest、ABI typecheck/build 与格式检查不引入当前改动相关错误。

## 2026-08-19 追加：报告执行步骤中的 Markdown 内容可见性修复

### 需求类型

报告模式历史展示缺陷修复（纯前端，不改接口协议与页面样式）。

### 背景

报告历史步骤可能同时返回普通 `text` 与用于说明 Skill/工具能力的 `markdown` 输出。当前展示层仅依据 `output_type` 将所有 Markdown/HTML 过滤为“最终报告正文”，导致同一步骤后半段的 Skill Markdown 说明没有显示。分隔符 `---` 已被 Markdown 正常渲染为水平线，但真正的 Markdown 说明被错误隐藏。

### 目标

- 执行步骤中的 Markdown/HTML 是否隐藏必须结合其所属 Todo/已识别报告产物判断，不能只看输出格式。
- 非报告生成 Todo 中的 Markdown/HTML 属于公开执行输出，按原有 Markdown 渲染方式完整展示。
- 报告生成 Todo 中的 HTML/Markdown/PDF/Word/report payload 继续作为报告产物处理，不在执行步骤内重复展示。
- 保留文本、代码、图片、分隔线以及报告文件卡和右侧预览的现有行为。

### 非目标

- 不修改历史步骤与 Todo 的归属、排序和数量。
- 不修改报告候选识别、完成/失败状态、下载与预览协议。
- 不修改普通对话、报告提交接口、样式或其他模块。

### 验收标准

- 包含两段 text、`---` 和 Skill Markdown 的普通执行步骤能够显示全部可公开内容。
- 最终报告生成步骤中的 HTML/Markdown 不会在 Todo 执行记录中重复出现。
- 既有报告文件卡和右侧报告预览仍只展示已识别的最终报告产物。
- 报告模式定向测试、类型检查和构建不新增错误。

## 2026-08-19 追加：报告执行输出支持 GFM Markdown 表格

### 需求类型

报告模式 Markdown 渲染缺陷修复（纯前端，不改数据协议）。

### 背景

步骤 `outputs` 返回 `output_type=markdown` 时可能包含 GitHub Flavored Markdown 表格，例如 `| 订单总金额 |`。当前报告步骤仅使用 ReactMarkdown 默认 CommonMark 能力，没有启用 GFM 插件，因此表格被解析为保留竖线的普通段落。

### 目标

- 报告 Todo 执行步骤的 Markdown 输出支持 GFM 表格语法。
- 表格包含表头、表体、边框、单元格留白，并在内容过宽时沿用步骤输出区域的横向滚动。
- 保持链接安全属性、代码、列表、分隔线和普通文本的现有渲染行为。

### 非目标

- 不修改历史适配、Redis 事件聚合、Todo 归属或报告产物识别。
- 不修改普通对话和其他 Markdown 组件。
- 不修改后端返回内容。

### 验收标准

- `| 订单总金额 |\n| --- |\n| 18418447.91 |` 渲染为 `table/thead/tbody`，不再显示为带竖线的普通段落。
- 表格在报告步骤卡片中具有清晰边框和表头背景。
- 报告模式定向测试、类型检查和构建通过。

## 2026-08-19 追加：报告完成耗时实时与历史统一展示

### 需求类型

报告模式字段映射缺陷修复（纯前端，不改后端协议与页面结构）。

### 背景

报告回答标题右侧已有“耗时 X 分 X 秒”的展示能力。实时事件在最后一条 `done` 中返回秒数 `time`，历史 `react-agent` 内容则返回秒数 `total_time`。当前历史适配仍错误读取 `time`，导致历史报告标题缺少耗时。

### 目标

- 实时报告从最后一条整体 `done.time` 读取总耗时。
- 历史报告从 `react-agent.total_time` 读取总耗时。
- 两条链路统一写入前端 `durationSeconds`，并在报告回答标题右侧显示为“耗时 X 分 X 秒”。
- 秒数按现有规则四舍五入后转换为分钟和余秒；缺失、负数或非有限数字不展示耗时。

### 非目标

- 不使用步骤级 `step.done` 计算耗时。
- 不根据前端时间戳推算耗时。
- 不修改普通对话、报告状态、Todo、报告文件与预览逻辑。
- 不兼容历史 payload 中错误的 `time` 字段，历史协议以 `total_time` 为准。

### 验收标准

- 收到整体 `{ type: 'done', time: 125 }` 后，报告标题显示“耗时2分5秒”。
- 历史 payload 返回 `{ total_time: 125 }` 时，报告标题显示“耗时2分5秒”。
- 没有合法耗时字段时标题右侧不显示虚假耗时。
- 报告模式定向测试、类型检查和构建通过。

## 2026-08-26 追加：探索模式工作室分栏数据表支持分页

### 需求类型

前端 UI 交互优化（纯前端，不改数据协议与后端接口）。

### 背景

探索模式右侧工作室分栏（ExplorePreviewPane）中的数据表当前一次性渲染全部行，数据量大时表格极长、需要大量滚动，浏览体验差。用户要求数据表像其他列表视图一样支持分页，且保持单个表格，不拆成多个表格。

### 目标

- 探索模式 `DataTable` 增加前端分页：默认每页 10 条，页大小可选 10/20/50/100，与 chat 其他列表分页规格一致。
- 分页为纯客户端行切片；表格始终保持单个 `<table>`，不拆成多个表格。
- 表底保留「共 N 条记录」，分页控件置于同一行右侧；数据不超过一页时不显示分页控件。
- chat 应用（`apps/chat/.../exploration-mode`）与 abi 应用助手调试（`apps/abi/.../exploration-mode`）保持一致行为。

### 非目标

- 不修改表格解析（单行表格还原）、左侧执行过程过滤、导出等逻辑。
- 不新增后端接口调用，不修改流式事件聚合与历史适配。
- 不修改报告模式与普通对话的表格渲染。

### 影响范围预期

- 修改：`apps/chat/src/components/conversation/exploration-mode/ExploreRichText.tsx`、`styles.module.css`
- 修改：`apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/ExploreRichText.tsx`、`styles.module.css`
- 新增 run log：`.ai/runs/2026-08-26-explore-studio-table-pagination/`

### 验收标准

- 工作室分栏打开长数据表时仅显示当前页行（默认 10 条），表底为「共 N 条记录」+ 分页控件。
- 翻页、切换页大小正常；切换页大小回到第 1 页；数据行数变化时页码自动收敛，不出现空页。
- 短表（不超过一页）表现与原来一致，仅显示「共 N 条记录」。
- 两个应用类型检查不新增错误。

## 2026-08-26 追加：探索模式思考内容打字机流式展示

### 需求类型

前端流式协议适配 + UI 体验优化（纯前端，适配后端新增 SSE 事件）。

### 背景

探索模式后端调整返回，思考过程改为按轮次流式下发：新增 `plan.thought.chunk` 事件，含 `round`、`thinking_delta`（深度思考增量）与 `delta`（简洁思考增量，最终固化为 `plan.thought`/`step.meta` 的 `thought`）。前端此前只消费固化事件，左上角「正在深度思考」区域要等整轮结束才一次性出现全部思考内容。用户要求该思考内容改为打字机模式逐步展示。

### 目标

- 解析并聚合 `plan.thought.chunk`：同轮增量拼接，`round` 切换时重置流。
- 运行中左上角思考区优先展示打字机流（简洁思考流 `delta` 优先，其次深度思考流 `thinking_delta`），固化事件（`plan.thought`/`step.meta`）到达后清空流并回退固化思考展示。
- 历史/结束态展示逻辑保持不变。
- chat 应用与 abi 应用助手调试探索模式保持一致行为。

### 非目标

- 不修改步骤输出、待办事项、工作室分栏、导出与历史适配逻辑。
- 不新增后端接口调用。
- 不为打字机增加额外动画/光标装饰，保持最小改动。

### 影响范围预期

- 修改：`apps/chat/src/components/conversation/exploration-mode/` 下 `types.ts`、`exploreStreamReducer.ts`、`ExploreMessageRow.tsx`
- 修改：`apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/` 下同三文件
- 新增测试：`apps/abi/.../exploration-mode/exploreStreamReducer.test.ts`
- 新增 run log：`.ai/runs/2026-08-26-explore-thinking-typewriter/`

### 验收标准

- 实时探索执行中，左上角思考区随 `plan.thought.chunk` 增量逐字展示，轮次切换时替换为新一轮思考。
- `plan.thought`/`step.meta` 到达后展示固化思考与「当前动作」，行为与原来一致。
- 历史探索卡片思考展示不变。
- reducer 特征测试通过；两个应用类型检查不新增错误。

## 2026-08-31 追加：助手开场引导回显 + 助手会话欢迎页 + 数据语义默认选中第一个

### 需求类型

Bug 修复 + 体验优化（纯前端，chat 应用）。

### 背景

1. 管理端助手配置可设置「开场引导」（prologue，存于 version.prologue），但 chat 端「应用工坊-我的助手」查看抽屉从未读取该字段，且开场引导折叠块误用助手画像 `prompt` 渲染，导致设置了开场引导仍显示「暂未设置开场引导」。
2. chat 端点击助手卡片会立即 `createApp` 创建绑定会话并跳转对话页；新会话无消息时消息区空白。要求进入后展示与欢迎页同款的页面：文案为对应助手开场引导、不展示推荐示例。
3. 输入框「数据」数据语义弹窗默认不选中任何项，要求默认选中第一个。

### 目标

- 助手查看抽屉开场引导正确回显 `version.prologue`（回退 `detail.prologue`）。
- 助手会话（appId≠0）消息列表为空时，消息区展示类欢迎页：标题=助手名、副标题=开场引导（回退描述），不渲染推荐示例卡片；有消息后自动消失。
- 数据语义候选就绪且未选中时自动选中第一个 schema 叶子（助手会话用绑定候选，普通会话用全局树）；历史会话回填的语义不被覆盖。

### 非目标

- 不改变「点击助手卡片立即创建会话」的现有流程。
- 不新增后端接口调用（复用现有 app/get 详情响应补充字段映射）。
- 不调整管理端开场引导编辑逻辑与普通会话欢迎页（TrustABI · 芯智 + 推荐示例）。

### 影响范围预期

- 修改：`apps/chat/src/pages/chat/workshop/AssistantDetailDrawer.tsx`（prologue 回显）
- 修改：`apps/chat/src/pages/chat/workshop/assistantResources.ts`（映射补充 prologue/description）
- 修改：`apps/chat/src/components/conversation-analysis/NewChatWelcome.tsx`（可选 title/subtitle/hideExamples）
- 修改：`apps/chat/src/components/conversation-analysis/index.tsx`（助手欢迎页接入 + 默认选中第一个）
- 修改：`apps/chat/src/components/conversation/index.tsx`、`hooks/useConversationController.ts`、`components/MessageList.tsx`（emptyContent 透传）
- 新增 run log：`.ai/runs/2026-08-31-assistant-prologue-welcome/`

### 验收标准

- 管理端设置开场引导后，chat 端助手查看抽屉「开场引导」展示设置内容。
- 点击助手卡片进入对话页，空白消息区展示助手名 + 开场引导文案，无推荐示例；发送首条消息后欢迎页消失。
- 进入对话页后数据语义按钮默认展示第一个候选名称；打开历史会话时仍回填该会话最后使用的语义。
- chat 应用类型检查不新增错误。

## 2026-08-31 追加二：助手会话延后创建 + 欢迎页接口调用治理

### 需求类型

体验优化 + 性能治理（纯前端，chat 应用）。覆盖上一节「不改变点击卡片立即创建会话流程」的非目标（用户本轮明确要求延后）。

### 背景

1. 点击助手卡片进入对话页时一次性触发大量接口：`session/add`（立即建会话）+ `session/get` 兜底 + `message/query` 空历史 + `fetchAssistantSessionList` 的逐助手 N 次 `session/list`。
2. 普通欢迎页同样一次涌入 1 次 `session/list`(appId=0) + 1 次 `app/list` + N 次逐助手 `session/list`（图二 8 个 list）。
3. 用户要求：点卡片先不建会话，发起对话后再创建，载荷与之前一致、仅时机延后。

### 目标

- 点助手卡片仅跳转 `/chat/task/new?appId=xx`，展示助手欢迎页（开场引导、无推荐示例）；首次发送/上传需要 conv_uid 时才 `createApp`，payload 同之前（space_id + appId + title=助手名）。
- 对话路由（hideSidebar）跳过逐助手会话合并（无消费方，路由恢复由 `session/get` 兜底）；保留侧栏场景给 `fetchAssistantSessionList` 加 60s TTL 缓存，重挂载/静默刷新不重复打 N 次 list。
- 创建后路由 search 清空，助手上下文由 curConv.appId 无缝接管（assistantId 不变 → 绑定资源不重拉、已选语义不清空）。

### 非目标

- 不改后端 session/list 按 appId 精确过滤的行为；不改侧栏历史列表数据源。
- 不删全局 StrictMode；不动模型/语义树的既有缓存守卫。

### 影响范围预期

- 修改：`apps/chat/src/pages/chat/workshop/index.tsx`（点卡片仅跳转携 appId）
- 修改：`apps/chat/src/pages/chat/task/$taskId.tsx`（validateSearch 接收 appId 透传 pendingAssistantId）
- 修改：`apps/chat/src/components/conversation-analysis/index.tsx`（待命助手上下文、createNewConv(options)、hideSidebar 跳过合并、欢迎页渲染分支）
- 修改：`apps/chat/src/service/api/app.ts`（fetchAssistantSessionList TTL 缓存）
- 新增 run log：`.ai/runs/2026-08-31-defer-assistant-session/`

### 验收标准

- 点助手卡片：无 `session/add`、无 `message/query`、无逐助手 `session/list`；仅助手详情 `app/get` + 常规 `session/list`(appId=0)/分组 list。
- 助手欢迎页发送首条消息后才出现 `session/add`，且 payload 含 appId 与助手名标题；会话进入后绑定资源限制与之前一致。
- 普通欢迎页 60s 内重复进入不再重复打逐助手 list。
- chat 应用类型检查不新增错误。

## 2026-08-31 追加三：大屏分享记录卡片对齐助手端

### 需求类型

前端 UI 一致性调整（纯前端，不改接口协议）。

### 背景

dashboard 微应用「我的大屏 → 分享记录」卡片仍为旧版行式字段（分享时间/过期时间/访问密码：无），助手端（abi 我的助手）已使用「渐变图标 + 名称 + 时间描述 + 底部状态标签 + 复制链接」卡片。用户截图要求大屏与助手保持一致：底部展示密码状态信息（当前启用：无密码/密码保护），复制链接时含密码一并复制。

### 目标

- `apps/dashboard/src/pages/my-screen/ShareRecordList.tsx` 卡片改为与助手端相同的 `abi-assistant-card` 结构：头部渐变圆角图标（大屏 Monitor 图标）+ 名称 + 「分享时间/过期时间」描述；底部密码状态标签（无密码/密码保护）+ 复制链接按钮。
- 复制链接行为不变，沿用既有「含密码一并复制」与大屏链接格式转换（`/#/`→`/`、`/dr/`→`/dashboard-share-page/`）。
- `ProjectList.less` 新增 `.abi-assistant-card` 系列样式（取值对齐 abi `table.scss`，保证两端视觉一致）。

### 非目标

- 不修改分享记录查询接口、分页、空态与切空间重拉逻辑。
- 不修改「已发布大屏」tab 卡片与样式（`abi-data-card` 仍被 home 项目列表使用）。
- 不修改助手端、chat 端分享记录既有实现。

### 影响范围预期

- 修改：`apps/dashboard/src/pages/my-screen/ShareRecordList.tsx`
- 修改：`apps/dashboard/src/pages/home/project-list/ProjectList.less`
- 新增 run log：`.ai/runs/2026-08-31-share-record-card-consistency/`

### 验收标准

- 大屏分享记录卡片结构与助手端一致：图标 + 名称 + 分享/过期时间，底部无密码/密码保护标签 + 复制链接。
- 复制链接含密码时一并复制，提示文案与助手端一致。
- dashboard 类型检查不新增错误。

## 2026-08-31 追加四：分享记录状态标签改为启用状态、按钮文案统一

### 需求类型

前端 UI 一致性修正（纯前端，不改接口协议）。覆盖追加三的标签口径。

### 背景

用户截图标注确认：分享记录卡片底部标签展示分享的启用状态信息（当前启用/已过期/已停用），不是密码状态（无密码/密码保护）；按钮文案为「复制链接和密码」。助手端（abi）与大屏端（dashboard）同步修改、保持一致。

### 目标

- 两端分享记录卡片底部 `ac-tag` 展示分享状态：`expirationDate` 已过期 → 已过期；后端 `status`/`shareStatus` 非启用 → 已停用；其余兜底「当前启用」（与助手卡片 `status==='1'` → 当前启用 口径一致）。启用绿色标签，非启用灰色（`.off` 变体）。
- 两端按钮文案统一「复制链接和密码」；复制逻辑沿用「含密码一并复制」。
- dashboard `ProjectList.less` 的 `.ac-tag` 补 `.off` 灰色变体（abi `table.scss` 已有）。

### 非目标

- 不修改复制逻辑、链接格式转换、分页、空态与切空间重拉。
- 不修改分享弹窗、已发布列表。

### 验收标准

- 两端分享记录卡片底部标签展示当前启用（或已过期/已停用），按钮展示「复制链接和密码」。
- abi、dashboard 类型检查不新增错误。

## 2026-08-31 追加：助手分享悬浮框数据语义改随 getProjectInfo 下发（废弃 schema/tree 独立调用）

### 背景与口径（用户 2026-08-31 确认）

- 助手分享悬浮框（`apps/chat/src/components/chat-widget`）的数据语义不再单独调 `GET /copilot/v1/schema/tree?spaceId=`，改由助手详情接口 `GET /dashboard/api/v1/project/getProjectInfo/{type}/{appId}?shareCode=` 一并下发，结构与 app/get 一致（`versions[].schemaSemantics[].schemaConfig[]`）；后端字段尚未加上，前端先行对接并降级为空列表。
- 2026-08-28 需求中「语义树来源：复用 /copilot/v1/schema/tree」一段废止；`WidgetAssistantInfo.spaceId` 及 `fetchSemanticTree` 删除。
- chat 主对话（`conversation-analysis`）、大屏的 `fetchSemanticTree` 不受影响，仍走 `/copilot/v1/schema/tree`。

### 影响范围与验收

- `apps/chat/src/components/chat-widget/service.ts`（`mapProjectSemantics` 纯函数 + `fetchAssistantInfo` 携带 `semantics`）、`ChatWidget.tsx`（树直接取助手信息）、`service.test.ts` 补纯函数测试。
- 后端未加字段时下拉显示「暂无数据语义」，对话不受影响；`pnpm --filter ai-bot exec tsc --noEmit` 与 chat-widget Vitest 通过。

## 2026-08-31 追加五：应用工坊三个菜单页签宽度统一按属性建模设置

### 需求类型

前端 UI 一致性调整（纯前端，不改接口协议）。

### 背景

用户截图标注（管理侧）：tab 宽度统一按照「本体网络 -> 属性建模」宽度设置。应用工坊三个菜单（我的助手 / 我的大屏 / 我的对话）顶部页签栏需与属性建模页签（`abi-attr-modeling-tabs`，见 `apps/abi/src/styles/scss/table.scss`）的宽度设置一致。

### 现状与目标

- 我的助手（`apps/abi/src/pages/workbench/app-workshop/my-assistant/index.tsx`）、我的对话（`app-workshop/my-chat/index.tsx`）已使用与属性建模同源的 `abi-attr-modeling-tabs`，保持不动。
- 我的大屏（dashboard 微应用 `pages/my-screen/MyScreen.tsx` 自定义 `.my-screen-tabs`）度量不一致：容器左右内边距 28px、页签间距 24px、页签内边距 12px 0 14px。统一为属性建模取值：左右内边距 24px、相邻页签间距 48px（=24 margin-right + 24 margin-left）、页签内边距 16px 0；背景对齐 `var(--abi-card-bg)`（带原值 fallback，保证独立运行兜底）。

### 非目标

- 不改三个页面的页签切换、搜索、分页、取消发布、分享等业务逻辑。
- 不改属性建模自身样式取值；不改我的助手 / 我的对话既有实现。

### 验收标准

- 我的大屏页签栏左右内边距、页签间距、上下内边距、背景与属性建模 / 我的助手 / 我的对话页签栏一致。
- dashboard `ProjectList.less` less 编译通过，类型检查不新增错误。
- 新增 run log：`.ai/runs/2026-08-31-app-workshop-tabs-width-unify/`。

## 2026-08-31 追加六：助手分享悬浮框交互对话 AI 消息 Markdown 渲染（窄屏适配）

### 需求类型

前端渲染/样式增强（纯前端，不改接口协议、不改对话流程）。

### 背景

助手分享页交互模式对话（选语义 → 正常对话）流程已就绪；后端语义虽未就绪，但问数/归因/预测类回复为 Markdown 富文本（表格、列表、标题、加粗），而分享悬浮框（约 420px 宽）此前 AI 消息按纯文本渲染，富文本无法展示。用户口径：「和主对话一样，选择语义，然后正常对话，就是具体 ai 消息样式要适配现在的宽度」。

### 目标

- `ChatWidget.tsx`：AI 消息改 Markdown 渲染，管线对齐主对话 ViewEle（`finalizeStreamText` 剥离 think/尾部 task_type JSON → 压缩连续换行 → 去 HTML 标签 → `marked.parse`），`marked.use({ breaks: true, gfm: true })`；历史消息与实时流消息渲染期统一清理（幂等）。human 消息保持纯文本气泡。
- `index.css`：AI 消息改占满面板宽度的卡片（`.abi-cw-msg-ai-body`），新增 `.abi-cw-md` 窄屏紧凑 Markdown 样式（表格 `display:block + overflow-x:auto` 横向滚动、标题/列表/代码块紧凑化）；流式光标改 `.abi-cw-msg-ai-body.streaming::after` 闪烁。

### 非目标

- 不新增问数/归因/预测模式入口、拼句模板、推荐问题接口；对话流程（选语义 + 正常对话）不动。
- 不改 service.ts / history.ts 数据流。
- 不渲染图表（view 消息），富文本仍以 Markdown 文本形式展示。

### 影响范围预期

- 修改：`apps/chat/src/components/chat-widget/ChatWidget.tsx`
- 修改：`apps/chat/src/components/chat-widget/index.css`
- 新增 run log：`.ai/runs/2026-08-31-chat-widget-ai-markdown/`

### 验收标准

- 分享页对话中，AI 回复的表格/列表/标题/加粗按 Markdown 渲染，表格超宽时横向滚动不撑破面板。
- 流式生成中显示闪烁光标；历史消息回放渲染结果一致（think 段与尾部 JSON 不出现）。
- chat-widget 单测、`tsc --noEmit`、`pnpm build` 通过。

## 2026-08-31 追加七：分享悬浮框对齐主对话交互模式（深度思考/图表/切换/点赞点踩，接口同主对话）

### 需求类型

前端功能增强（复用主对话既有接口，不新增后端协议）

### 背景

用户口径：「要和正常的是一样的，深度思考，描述分析，图表，然后支持切换图表，底部点赞点踩」「就是和 chat 一样的，接口也是一样的」。即分享悬浮框的 AI 消息形态与数据链路完整对齐主对话。

### 目标

- 深度思考：流中实时展示「深度思考中...」（可折叠），完成后「已深度思考」；think 段由 `parseAiRaw` 结构化剥离。
- 图表：`[DONE]` 后尾部 JSON 含 `sql` 时，走与主对话同接口 `/chat-proxy/api/v1/chat/db/query` 查数，ECharts 渲染（option 与 ViewEle 共用 `helpers/chartOption.ts`）；类型白名单与 ViewEle 一致，支持 7 类切换。
- 轮次与点赞点踩：同主对话接口 `round_index/max` 与 `feedback/add`；再点同状态 = 取消评价回 0，成功后本地高亮。
- 历史消息：加载后同一套解析补 thinking/图表（有 dbName 时）。
- 抽取共享：`conversation/helpers/chartOption.ts`（processChartData/getChartOption/parseISO8601Duration/parseISODate/DEFAULT_CHART_STYLE），ViewEle 改 import，行为等价。
- 降级：session/add 未下发 `db_name` 时图表不展示（对齐主对话 dbName 守卫）。

### 非目标

- 不实现表格视图/SQL 面板/图表配置弹窗/导出等 ViewEle 附属能力。
- 不改主对话既有交互；不新增后端接口。

### 影响范围预期

- 新增：`apps/chat/src/components/conversation/helpers/chartOption.ts`
- 修改：`ViewEle.tsx`（改 import）、`chat-widget/{service,history,ChatWidget,index.css}`、`service.test.ts`
- 更新 run log：`.ai/runs/2026-08-31-chat-widget-ai-markdown/`

### 验收标准

- 分享对话中 AI 消息依次呈现：深度思考折叠面板 → Markdown 描述分析 → 图表（可切换类型）→ 底部点赞点踩。
- SQL 查数/轮次/评价走主对话同路径接口；shareCode 随 body 下发免登录。
- chat-widget 单测（23/23）、`tsc --noEmit`、`pnpm build` 通过；ViewEle 图表渲染行为等价。

## 2026-09-01 追加：MCP 安全认证方案可编辑性与下行/上行选择持久化修复

### 需求类型

前端缺陷修复（表单交互 + 提交/回显格式，不改后端接口协议）。

### 背景

1. bearer 模式下 `updateScheme` 在任意字段变更时都强制用平台 token 覆盖 `defaultCredential`，手动编辑「默认凭证」会被立即覆盖，实际不可编辑。
2. 下行/上行认证选择存于 `toolSpecification.extensions`。前端原先提交嵌套对象，后端 extensions 为扁平 Map<String,String>，嵌套对象被丢弃（详情返回 `toolSpec.extensions` 为 `{}`），导致退出编辑再回来选择为空。

### 目标

- 仅在切换到 bearer 时自动填充平台 token；手动编辑默认凭证/ID 不再被覆盖。
- extensions 保持嵌套对象直传（与提供给后端的传参版本一致）；后端补字段支持，前端回显按对象直读，不做编码猜测。

### 非目标

- 不修改 basic/apiKey 模式、安全方案其他字段、MCP 列表/详情/删除/状态切换逻辑。
- 不修改 tools/toolsMeta/securitySchemes 的提交字段名与结构。

### 影响范围预期

- `apps/abi/src/pages/component/system/plugin/components/SecuritySchemeSection.tsx`
- `apps/abi/src/pages/component/system/plugin/components/PlugUpdate.tsx`
- `apps/abi/src/pages/component/system/plugin/index.tsx`
- `.ai/runs/2026-09-01-mcp-security-scheme-fixes/`

### 验收标准

- bearer 默认凭证可手动修改且不被自动填充覆盖；新增方案/切换到 bearer 时仍自动填充。
- 后端补齐 extensions 字段支持后，重新编辑能正确回显下行/上行选择及透明认证/凭证覆盖（前端提交/回显逻辑已就绪）。
- tsc 不新增报错。

## 2026-09-02 追加：探索模式代码编辑面板滚动条修复

### 需求类型

前端缺陷修复（纯 CSS 高度链，不改接口与交互）。

### 背景

探索模式右侧「代码编辑」面板（ExploreCodeEditorPane）中 CodeMirror 编辑器在内容超出面板高度时没有纵向滚动条，超出内容被裁切看不全。原因是 `@uiw/react-codemirror` 外层包裹 div（`.cm-theme-light`）默认高度 auto，使 `.cm-editor` 的 `height: 100%` 失效、编辑器被内容撑高后被 `.codeEditorBody` 的 `overflow: hidden` 裁切。

### 目标

- 给 `.codeEditorBody` 内 CodeMirror 包裹层确定高度（100%），使 `.cm-editor` / `.cm-scroller` 的 100% 高度链生效，内容超出时编辑器内部出现纵向滚动条，可滚动看全内容。
- 不改编辑器边框、圆角、字体与头部布局；复制 / 收起交互不变。

### 非目标

- 不引入 python / bash 语法高亮扩展；不回写编辑结果到后端。
- 不改工作室（ExplorePreviewPane）、报告侧栏样式。

### 影响范围预期

- `apps/chat/src/components/conversation/exploration-mode/styles.module.css`
- 新增 run log：`.ai/runs/2026-09-02-explore-code-editor-scrollbar/`

### 验收标准

- 代码编辑面板打开长代码时编辑器内出现纵向滚动条，滚动可看全内容；面板外框不被撑高或裁切。
- 代码不足一屏时不出现滚动条，编辑器外框（边框/行号槽）撑满面板内容区，与长代码状态外框一致；头部、复制 / 收起交互不变。
- chat 应用构建与类型检查不新增错误。

## 2026-09-02 追加二：分享复制按钮对齐大屏分享弹窗口径（密码有无决定文案与复制内容）

### 需求类型

前端缺陷修复 + 文案一致性（纯前端，不改接口协议）。

### 背景

用户反馈：「已发布助手 → 分享记录」中对有密码的分享点「复制链接和密码」，剪贴板内容只有分享链接没有密码；截图标注「复制信息，没有密码」。参照物为大屏分享弹窗按钮（密码有无决定按钮文案与复制内容，行为正确）。用户要求大屏分享记录按钮、助手分享按钮、助手分享记录按钮三处对齐该口径。分享记录列表接口（`/project/share/list`）返回字段无文档，密码字段名后端未统一，前端此前仅读 `sharePassword`。

### 目标

- 两端分享记录（abi `my-assistant/ShareRecordList.tsx`、dashboard `my-screen/ShareRecordList.tsx`）密码映射兼容 `sharePassword || password || sharePwd`（同名称字段兼容映射口径）；分享弹窗（`AssistantShareModal.tsx`）创建响应密码读取同口径兼容。
- 两端分享记录按钮文案随密码有无切换：有密码「复制链接和密码」、无密码「复制链接」（同大屏分享弹窗口径，覆盖 2026-08-31 追加四的固定文案）；复制内容与提示文案沿用既有条件逻辑。
- 复制内容格式不变：有密码 `分享链接：{url}\n访问密码：{pwd}`，无密码仅链接；大屏链接格式转换（`/#/`→`/`、`/dr/`→`/dashboard-share-page/`）仅大屏端沿用，助手端保持后端哈希路径原样（chat 应用 `dashboard_share_page/{code}` 哈希路由直接渲染后端路径）。

### 非目标

- 不修改分享记录查询接口、分页、空态、切空间重拉与状态标签逻辑。
- 不修改大屏分享弹窗（参照物）与 chat 端分享页。
- 不新增接口调用。

### 影响范围预期

- 修改：`apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx`、`AssistantShareModal.tsx`
- 修改：`apps/dashboard/src/pages/my-screen/ShareRecordList.tsx`
- 新增 run log：`.ai/runs/2026-09-02-share-copy-password-align/`

### 验收标准

- 列表/创建响应任一兼容字段带密码时，复制内容含「访问密码」行、按钮文案「复制链接和密码」；无密码时按钮文案「复制链接」、复制仅链接。
- 后端列表不返回任何密码字段时按钮不再承诺复制密码（文案「复制链接」），行为与大屏分享弹窗一致。
- abi、dashboard 类型检查不新增错误。

## 2026-09-03 追加：分享悬浮窗四块交互增强（放大缩小/四边拖拽/语义抽屉/输入工具栏）

### 需求类型

前端交互增强（分享悬浮窗 ChatWidget 纯前端；不新增后端接口）。

### 背景

产品截图四处标注，对象为助手分享对话悬浮窗（apps/chat chat-widget，分享页与第三方嵌入共用）：头部缺放大/缩小按钮（归因分析看板已有全屏按钮可参照）；信息条「数据语义」chip 分享场景不可点、看不了语义详情；窗体仅头部整体拖拽、边框不能改大小；输入工具栏缺主对话的模式/思考/工具三个入口。

### 目标

1. 头部关闭按钮左侧加放大/缩小切换按钮，图标与交互同归因分析看板全屏按钮（AttributionDashboard fsBtn）一致；放大后窗体铺满视口，缩小恢复放大前尺寸（含拖拽自定义尺寸）。
2. 信息条「数据语义」chip 改为可点（仅该消息携带 schemaId 时）：点击后窗体默认进入放大态，语义 Schema 详情以窗内抽屉展示（复用 SchemaFieldsModal）。
3. 窗体上/下/左/右四边加拖拽把手，支持拖拽实时改宽高（最小尺寸与视口边界约束）；放大态禁用把手。
4. 输入工具栏对齐主对话补三个入口：模式（交互/报告/探索三选下拉，报告/探索先不对接发送协议与专属渲染）、思考开关（透传 extra_body.enable_thinking，默认开启保持现状）、工具（「更多」菜单：查看语义/技能/MCP；技能/MCP 列表从助手详情 getProjectInfo 同响应提取，选中后随发送透传 skills/mcp source version ids，字段名同主对话）。

### 非目标

- 不对接报告/探索模式的发送协议（chat_mode 映射）与消息渲染管线。
- 不新增后端接口调用；技能/MCP 列表从 getProjectInfo 同响应提取。
- 不改主对话与大屏 AiChatPanel 的信息条、输入工具栏；不改归因分析看板。
- 不改分享窗思考卡/图表/点赞点踩等既有渲染链路。

### 影响范围预期

- 修改：`apps/chat/src/components/chat-widget/{ChatWidget.tsx,index.css,service.ts}`
- 新增 run log：`.ai/runs/2026-09-03-chat-widget-window-enhancements/`

### 验收标准

1. 头部放大/缩小按钮位于关闭按钮左侧，图标随状态切换；放大铺满视口、缩小恢复此前尺寸，可反复切换。
2. 点击带 schemaId 的语义 chip：窗体自动放大、Schema 抽屉窗内右侧滑出，字段分组/搜索/筛选可用；无 schemaId 的 chip 保持不可点。
3. 四边拖拽实时改窗体尺寸，不小于最小尺寸、不越出视口；放大态无把手。
4. 模式下拉交互/报告/探索三态可切换；思考开关控制 enable_thinking（默认开）；「更多」菜单查看语义同目标 2 抽屉，技能/MCP 可多选并随发送透传。
5. chat-widget 单测与 `tsc --noEmit` 不新增错误；分享对话既有发送/渲染无回归。

### 测试要求

- `pnpm test`（chat-widget 相关：service/history/shareUrl）。
- apps/chat 目录 `tsc --noEmit`。
- 手工：分享页拖拽/放大/四边 resize/语义抽屉/工具栏交互。

## 2026-09-03 追加二：分享记录密码改走详情单查接口（GET /project/share/{shareCode}，助手与大屏统一）

### 需求类型

Bug 修复延续（分享记录复制缺密码）+ 接口对接调整。

### 背景

用户确认：分享记录列表接口（`POST /project/share/list`）不返回密码字段，后端已改为单独查询 `GET /api/v1/project/share/{shareCode}`，助手分享与大屏分享统一。因此「2026-09-02 追加二」中基于列表行密码字段的兼容映射与按钮文案切换方案作废：行数据永远无密码，文案会永远退化为「复制链接」。

### 目标

- 两端分享记录（abi `my-assistant/ShareRecordList.tsx`、dashboard `my-screen/ShareRecordList.tsx`）行数据改存 `shareCode`（列表缺字段时从分享链接尾段兜底），删除行级密码映射。
- 点击「复制链接和密码」时按 shareCode 单查详情（abi `fetchProjectShareDetailApi`，网关路径 `/api/dashboard/api/v1/project/share/{shareCode}`；dashboard `baseApi.getSharePassword`，路径 `/dashboard/api/v1/project/share/{shareCode}`）取密码，密码字段读 `sharePassword` 单字段（后端字段已明确，不保留兼容链）。
- 有密码复制 `分享链接：{url}\n访问密码：{pwd}`，无密码仅链接；详情查询失败时降级仅复制链接并 warning 提示，不阻断复制。
- 按钮文案恢复固定「复制链接和密码」（密码在点击时才可知，列表行无法预判；复制内容与 toast 随实际密码切换），即恢复 2026-08-31 追加四口径、覆盖 2026-09-02 追加二的文案切换。
- 助手分享弹窗（`AssistantShareModal.tsx`）创建响应密码读取收敛回 `sharePassword` 单字段（创建响应字段明确，删除兼容链）；弹窗自身不查详情。
- 大屏端链接格式转换（`/#/`→`/`、`/dr/`→`/dashboard-share-page/`）不变；助手端保持后端哈希路径原样。

### 非目标

- 不改分享创建、列表分页、状态标签、空态与切空间重拉逻辑。
- 不改大屏/助手分享弹窗的复制按钮（创建响应已含密码，行为正确）。
- 不在列表加载时批量预查详情（避免 N 次请求，仅点击时单查）。

### 影响范围预期

- 修改：`apps/abi/src/service/api/share.ts`、`apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx`、`AssistantShareModal.tsx`
- 修改：`apps/dashboard/src/api/BaseApi.ts`、`apps/dashboard/src/pages/my-screen/ShareRecordList.tsx`
- 新增 run log：`.ai/runs/2026-09-03-share-detail-password/`

### 验收标准

- 有密码的分享记录点「复制链接和密码」，剪贴板含「访问密码」行；无密码记录仅复制链接，toast 区分两种结果。
- 详情接口失败时仅复制链接并 warning 提示，无未捕获异常。
- 两端按钮文案固定「复制链接和密码」。
- abi、dashboard 类型检查不新增错误。

## 2026-09-03 追加三：日志管理（log）一级路由骨架与用户下拉入口

### 需求类型

新功能（路由骨架；子菜单待平台配置后追加）

### 背景

平台菜单管理已新增「日志管理」目录菜单（路由地址 `log`，图标 ClockCircle，排序 5），与「系统管理」（`manage`）同级；其两个子菜单「访问记录」「操作记录」尚未在平台配置，待用户配置完成后再补充本地子路由与页面。

### 目标

- 参照 `manage` 的本地接线方式补 `log` 一级路由骨架：elegant 静态路由（children 暂空）、transform routeMap、`@elegant-router/types`（RouteMap/FirstLevelRouteKey）、zh-cn/en-us route 文案。
- 用户下拉菜单（global-sider）在「空间管理」与「退出登录」之间加「日志管理」项，图标 ClockCircleOutlined，后端路由含 `log` 时显示；点击经 itemMap `log` 跳转，目标路由未注册时不跳转，避免回退通配路由。
- VerticalMenu 登记 log 导航标签与 manage-menu-wrapper 样式分组。

### 非目标

- 不开发「访问记录」「操作记录」两个子菜单及其页面组件（待平台配置完成后追加）。
- 不改平台菜单配置；不改 global-header UserAvatar 旧下拉。

### 影响范围预期

- 修改：`apps/abi/src/router/elegant/{routes,transform}.ts`、`apps/abi/src/types/elegant-router.d.ts`、`apps/abi/src/locales/langs/{zh-cn,en-us}/route.ts`、`apps/abi/src/constants/layout/global_side.ts`、`apps/abi/src/layouts/modules/global-sider/index.tsx`、`apps/abi/src/layouts/modules/global-menu/components/VerticalMenu.tsx`
- 新增 run log：`.ai/runs/2026-09-03-log-management-route/`

### 验收标准

1. 后端菜单含 `log` 目录时，用户下拉在「空间管理」与「退出登录」之间显示「日志管理」。
2. 子菜单配置并补页面后，点击「日志管理」进入 `/log` 首个子菜单；配置前点击不跳转、不回退通配路由。
3. `pnpm typecheck`（apps/abi）不新增错误。

### 测试要求

- `pnpm typecheck`（apps/abi）对比基线无新增错误。
- 手工：下拉入口显示；子菜单配置后导航与 VerticalMenu 标签。

