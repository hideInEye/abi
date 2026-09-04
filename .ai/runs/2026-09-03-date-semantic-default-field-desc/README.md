# 日期语义类型字段描述自动填充

## 基本信息

- 日期：2026-09-03
- 任务名称：date-semantic-default-field-desc
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Qoder
- 涉及 agent：Developer、Regression
- 任务类型：新功能（UI 行为增强）

## 需求摘要

「编辑数据语义」弹窗中，语义类型为「日期」（value=`datetime`）的字段，在字段描述为空时自动填充默认文案：`用户问题未涉及时间范围场景，默认最近3个月`。已有描述（已保存或用户手填）不覆盖。

## 影响范围

- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/components/semantics-table-config.tsx`

## 修改文件

- `apps/abi/src/pages/workbench/data-preparation/data-table-meaning/components/semantics-table-config.tsx`

## 实现说明

新增模块级常量 `DATE_SEMANTIC_DEFAULT_DESC` 与纯函数 `withDateDefaultDesc(field, semanticType)`：仅当 `semanticType === 'datetime'` 且 `fieldDesc` 为空（trim 后）时返回填充了默认描述的新字段对象，否则原样返回。在四个语义类型赋值点统一接入：

1. 编辑模式 `initForm()` 加载已保存语义时（覆盖截图中已保存日期字段描述为空的场景）。
2. 字段表格渲染时按字段类型默认映射语义类型（`handleSemanticsShow`）的分支：**保持原有就地修改 store 字段对象的模式**（浅拷贝数组与 store 共享同一对象，各行 `setFields` 不会互相覆盖，单次渲染 pass 收敛），在其上就地填充默认描述，并同步修改行 record 与 `form.setFieldValue` 供字段描述表单项显示。
3. 语义类型下拉 `onChange`：用户手动选择日期时填充；主键单选联动把其他主键降级为默认类型（可能为 datetime）时同样填充并同步表单。
4. 「AI帮填」回填语义类型后，若为日期且描述为空则填充（后续既有表单同步循环会写入显示）。

不新增接口调用；用户手动清空日期字段描述后不会被再次自动填充（仅语义类型变更/初始化时触发）。

## 测试记录

### 执行的命令

- `GetProblems`（IDE 诊断）：修改文件无错误
- `npx tsc --noEmit -p apps/abi/tsconfig.json`

### 测试结果

修改文件无类型/ lint 错误。tsc 全量退出码 1，但报错均为存量问题（`build/config/proxy.ts` 缺 `chatURL`、`build/plugins/unplugin-icon.ts` vite5/vite6 类型冲突），与本次改动无关。

### 失败和修复过程

第一版实现被用户驳回：渲染期默认赋值分支误将原有的就地修改（`newFields[globalIndex].semanticType = ...`）改为整体替换新对象（`newFields[globalIndex] = {...}`）。由于每行 render 闭包持有旧 `fields`，替换新对象后 store 中旧对象未被修改，后一行的 `setFields([...fields])` 会覆盖前一行的赋值，导致 N 个字段需要 N 轮渲染 pass 收敛、O(N²) 次 store 更新，大数据量下第一步跳第二步页面卡死。修复：渲染分支恢复就地修改模式并就地填充描述，仅事件/效应触发的赋值点（initForm、onChange、AI帮填）使用 `withDateDefaultDesc` 生成新对象。

## 回归检查

- 非日期语义类型字段描述行为不变（helper 直接返回原对象）。
- 已保存描述的日期字段编辑回显不变（不覆盖有值描述）。
- 主键单选联动、AI帮填既有填充与缺失提示逻辑不变，仅叠加空描述填充。
- 保存链路不变：描述随 `fields` 经 `streamlinedData`/`assembleData` 正常提交。

## Review 结果

改动限定单文件、单 helper、四个赋值点接入；无新增接口调用；无大范围重构。

## 发现的问题

无新增。存量 tsc 报错（build 目录 vite 版本类型冲突）与本任务无关。

## 本轮经验

- antd 表单项 `initialValue` 仅首次注册生效，渲染期计算出的默认值必须显式 `form.setFieldValue` 同步显示。
- 本组件渲染期存在「每行 render 内 `setFields([...fields])`」的旧闭包模式：依赖就地修改 store 字段对象保证单 pass 收敛；任何把就地修改改为替换新对象的重构都会退化为 O(N²) 更新并卡死页面，改动此类代码时必须保持原赋值语义。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。

### 需要更新的 prompts

不需要。

### 需要更新的 agents

不需要。

### 需要更新的 skills

不需要。

### 需要更新的 MCP 建议

不需要。

### 需要更新的 checklists

不需要。

## 后续建议

如产品要求「切换离开日期类型时清除自动填充的描述」，可在 `onChange` 中记录自动填充来源后再清除；当前需求未要求。

## 未解决问题

无。
