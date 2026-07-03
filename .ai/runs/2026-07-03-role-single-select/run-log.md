# 角色选择单选改造 Run Log

## 基本信息

- 日期：2026-07-03
- 任务名称：role-single-select
- 需求文件：`.ai/requirements/CURRENT_REQUIREMENT.md`
- 执行 AI：Codex
- 涉及 agent：Developer、Test
- 任务类型：UI 调整 / 表单行为调整

## 需求摘要

将 `/space/user`、`/manage/user` 以及新建/编辑空间的用户管理分配角色场景中的角色选择改为单选，并兼容后端原有数组结构。

## 影响范围

- `apps/abi/src/pages/manage/user/**`
- `apps/abi/src/pages/space/user/**`
- `apps/abi/src/pages/space-list/**`
- `apps/abi/src/styles/scss/table.scss`

## 修改文件

- `.ai/requirements/CURRENT_REQUIREMENT.md`
- `apps/abi/src/pages/manage/user/index.tsx`
- `apps/abi/src/pages/manage/user/modules/user-operate-drawer.tsx`
- `apps/abi/src/pages/space/user/index.tsx`
- `apps/abi/src/pages/space/user/modules/PermissionManagement.tsx`
- `apps/abi/src/pages/space/user/modules/PermissionManagement.scss`
- `apps/abi/src/pages/space-list/components/PermissionManagement.tsx`
- `apps/abi/src/pages/space-list/modules/UserManagement.tsx`
- `apps/abi/src/styles/scss/table.scss`

## 实现说明

- `/manage/user` 新建/编辑用户的 `roleIds` 选择移除多选模式，编辑回显取第一个角色，提交时再转换为单元素数组，保持接口字段兼容。
- `/space/user` 分配角色抽屉由 `ACheckbox.Group` 改为 `ARadio.Group`，历史多角色数据回显时只取第一个角色，提交到 `owners` 时仍保持 `roles: [{ roleId, roleName }]` 数组结构。
- 新建/编辑空间中的用户管理分配角色抽屉同样改为 `ARadio.Group`，回显和保存均只保留一个角色。
- 为两处角色卡片样式补充 `.ant-radio-wrapper` 兼容，保留原有视觉布局。

## 测试记录

### 执行的命令

- `git diff --check`
- `/usr/local/bin/pnpm --filter chatbi typecheck`
- `/usr/local/bin/pnpm --filter chatbi typecheck 2>&1 | rg "src/pages/(manage/user/index|manage/user/modules/user-operate-drawer|space/user/index|space/user/modules/PermissionManagement|space-list/components/PermissionManagement|space-list/modules/UserManagement)|src/styles/scss/table"`
- `/usr/local/bin/pnpm --filter chatbi build`
- `rg -n "mode=\"multiple\"|ACheckbox.Group|ACheckbox value" apps/abi/src/pages/manage/user apps/abi/src/pages/space/user/modules/PermissionManagement.tsx apps/abi/src/pages/space-list/components/PermissionManagement.tsx -g "*.{ts,tsx}"`

### 测试结果

- `git diff --check`：通过。
- `/usr/local/bin/pnpm --filter chatbi build`：通过。
- 目标角色选择回归搜索：无残留多选角色控件。
- `/usr/local/bin/pnpm --filter chatbi typecheck`：失败，被项目既有类型错误阻塞。

### 失败和修复过程

- 默认 `pnpm` 为 11.7.0，与项目 lockfile 不兼容，会尝试 install 并在非 TTY 下中止；改用 `/usr/local/bin/pnpm` 8.15.9 执行验证。
- `chatbi typecheck` 进入 `tsc` 后失败，主要错误包括 `build/config/proxy.ts` 缺 `chatURL`、`window.qiankunStore` 类型缺失、`rc-menu/lib/interface` 类型缺失、i18n 类型不匹配、多个历史页面表格类型错误、workspace packages 中 `react/@sa/*` 类型解析问题等。定向过滤后，本次新增的 Radio/单选适配没有出现新的明确阻塞。
- `chatbi build` 通过，但保留既有 warning：UnoCSS 图标 `selector-popover`/`selector-trigger` 加载失败、动态/静态重复 import、部分 chunk 大于 500 kB。

## 回归检查

- `/manage/user` 用户新建/编辑角色字段已改为单选，提交仍发送 `roleIds` 数组。
- `/space/user` 分配角色已改为单选，保存仍写入 `owners` 中的 `roles` 数组结构。
- 新建/编辑空间的用户管理分配角色已改为单选，保存仍保持 `roles` 数组结构。
- 用户/部门选择弹窗中的 `ACheckbox.Group` 保留，因为它用于选择成员，不属于角色选择。

## Review 结果

- 修改范围集中在本次需求相关的 ABI 用户和空间用户管理文件。
- 未新增后端接口，未修改请求 URL 或请求封装。
- 未恢复或覆盖用户未说明改动。

## 发现的问题

- 根需求文件此前仍是示例需求，已更新为本次正式需求。
- 根/ABI typecheck 当前无法作为通过门禁，存在项目级既有 TS 问题。

## 本轮经验

针对角色单选这类 UI 行为调整，需要同时处理控件模式、编辑回显、提交字段兼容和历史多角色数据降级。

## 是否需要更新 AI 系统

### 需要更新的 context

不需要。未发现新的长期架构事实。

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

建议后续单独处理 `apps/abi` 的项目级 TypeScript 错误，使 `pnpm --filter chatbi typecheck` 可以重新作为可靠门禁。

## 未解决问题

未进行浏览器手工 smoke；本轮以代码回归搜索和 `chatbi build` 验证为主。
