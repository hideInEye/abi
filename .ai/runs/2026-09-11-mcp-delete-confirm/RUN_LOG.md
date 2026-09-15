# MCP / MCP分组删除增加成功提示

## 需求

删除 MCP 分组、删除 MCP 服务成功后前端没有任何提示，需要补充「删除成功」toast。（首轮曾误解为需要删除前二次确认弹窗，相关改动已全部通过 `git checkout` 撤回。）

## 修改内容

- `apps/abi/src/pages/component/system/plugin/index.tsx`
  - `toDeletePlugin`：接收 `deleteMcp` 返回值并用 `isFlatRequestSuccess` 判定，明确成功才 `message.success('删除成功')` 并刷新列表；失败直接 return，走全局错误处理，不再无条件刷新。
- `apps/abi/src/components/stateful/group/Group.tsx`
  - `handleDeleteGroup`：`handleGroupDelete` 成功返回后（内部 `assertFlatRequestSuccess` 失败会抛错）`message.success('删除成功')`。
  - 该组件为通用分组组件，数据字典等其他分组面板删除成功同样会提示，行为一致为"增加成功提示"，无破坏性。

## 撤回记录

- `PluginTable.tsx`、`Group.tsx` 首轮的 Modal.confirm 二次确认改动已完整还原为 HEAD 版本，`git status` 确认 PluginTable.tsx 无残留改动。

## 验证

- `tsc --noEmit --skipLibCheck`：两个修改文件无错误。
- `vitest run shared-api-response-contract.test.ts`：18/18 通过（含 `deleteTableSemanticsGroup` 的 await + guard 契约）。
- `plugin/index.tsx` 尚无契约测试文件；本次 `deleteMcp` 调用点已按契约模式（await + isFlatRequestSuccess guard + 成功后才 callback）实现，guard 逻辑由 flat-result 既有单测覆盖。为该文件补全量契约测试需给其余 4 个接口调用点（queryMcpList/registerMcp/updateMcp/getMcpDetail）同步加 guard，超出本次需求范围，记录为未解决事项。
- 手工回归建议：
  1. 删除单个 MCP（卡片/列表/批量）→ 成功后出现「删除成功」toast 且列表刷新；接口失败时无 toast、不刷新。
  2. 分组编辑弹窗点「删除」并确认 → 成功后出现「删除成功」toast 且弹窗关闭；有子分组时仍提示先处理子分组。

## 回归检查

- 删除接口调用链未变，仅增加成功判定与提示；`toDeletePlugin` 失败分支由"无条件刷新"改为"不刷新"，属于修复性收敛。

## 是否需要更新其他 .ai 资产

- context / decisions / prompts：无需变更。
- 未解决事项：`plugin/index.tsx` 契约测试缺失（见验证部分）。
