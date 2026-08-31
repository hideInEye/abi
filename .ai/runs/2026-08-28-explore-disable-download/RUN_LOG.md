# 探索模式工作室屏蔽下载按钮

## 需求
探索模式「工作室」面板暂不支持下载，屏蔽下载按钮（注释保留代码，便于后续恢复）。

## 改动文件
1. `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/exploration-mode/ExplorePreviewPane.tsx`
2. `apps/chat/src/components/conversation/exploration-mode/ExplorePreviewPane.tsx`

两处改法一致：
- 下载按钮 + 导出下拉（Word/PDF/HTML）JSX 整块用 `{/* 暂不支持下载，屏蔽下载按钮 ... */}` 注释保留
- `EXPORT_MENU_ITEMS` 常量注释保留，注释中注明恢复时需还原的导入
- 移除因屏蔽不再使用的导入：`DownloadOutlined`、`Dropdown`、`MenuProps`、`downloadExploreExport`、`ExploreExportFormat`
- `exploreExport.ts` 未改动（`isStructuredOutput` 仍被使用）

## 非目标
- 其他下载入口（图表下载、附件下载、技能包下载）不在本次范围内
- 不删除 `exploreExport.ts` 导出实现，保持可恢复

## 验证
- `apps/abi` 与 `apps/chat` 分别执行 `tsc --noEmit`，改动文件无报错
- 现存报错均为历史遗留且与本次无关：abi 的 `build/config/proxy.ts`、`build/plugins/unplugin-icon.ts`；chat 的 `src/components/conversation/autoChart/multi-measure-pie-chart.ts`

## 回归检查
- 工作室面板「收起结果」按钮、状态标签、分步骤数据/最终结论/执行摘要展示不受影响
- 未触碰用户既有未提交改动（`ExploreMessageRow.tsx`、`styles.module.css`）

## 恢复方式
取消两处注释（JSX 块与 `EXPORT_MENU_ITEMS`），并还原顶部 `DownloadOutlined/Dropdown/MenuProps` 与 `exploreExport` 相关导入。

## 后续建议
无需更新 `.ai/context/`、`.ai/prompts/` 等目录；本次为纯 UI 屏蔽，无架构变化。
