# Run Log: drawer common component

## 时间

2026-07-06

## 需求

把 ABI 中抽屉弹窗在 Ant Design Drawer 基础上封装为公共组件，统一所有抽屉顶部样式，移除业务组件重复头部样式，运行构建测试，并将公共组件使用规则写入 `.ai`。

## Subagent

- 创建 explorer subagent `Boyle` 做只读核查。
- 核查结果：ABI 活跃抽屉约 67 处，未发现活跃 `UiDrawer`；确认 `extra` 中存在业务按钮、保存、批量添加、分组提示等，不可被简单覆盖；确认数据源抽屉为视觉基准。

## 修改概要

- 新增 `apps/abi/src/components/stateless/common/CommonDrawer/`：
  - 基于 Ant Design `Drawer` 包装。
  - 统一 `className`、标题图标块、关闭按钮、头部分隔线与背景样式。
  - 支持 `icon`、`description`、`extra`，保留原 `DrawerProps` 中的 `open/onClose/footer/width/destroyOnClose/placement/styles/headerStyle` 等行为属性。
  - `extra` 与统一关闭按钮并存；`closable={false}` 时不注入关闭按钮。
- 将 ABI 业务中的活跃 `ADrawer`/`Drawer` 替换为 `CommonDrawer`。
- 将旧业务头部 JSX/行内 style 收敛为 `CommonDrawer` 的 `title/icon/description/extra` 参数。
- 移除业务样式中的重复头部样式：
  - 编辑用户抽屉头部相关 `.user-drawer-title*` / `.user-drawer-close`。
  - 分配角色抽屉 `.perm-title-v5` / `.perm-close-icon`。
  - 菜单、机构抽屉遗留 title/close 样式。
  - 全局 `table.scss` 中数据源、预览、元数据、空间、MCP 等旧抽屉头部 class。
- 更新 `.ai/context/UI_STYLE_GUIDE.md`：新增 ABI 抽屉必须使用 `CommonDrawer` 的规则。
- 更新 `.ai/requirements/CURRENT_REQUIREMENT.md` 为本轮公共组件需求。

## 验证

- `git diff --check`：通过。
- TSX parse 检查 CommonDrawer 相关文件：通过。
- `rg "closable=\{closable\}" CommonDrawer`：无匹配，确认不再把公共组件的 `closable` 透传给 Ant Design 默认关闭按钮。
- `rg` 回归检查：
  - 活跃业务抽屉已使用 `CommonDrawer`。
  - `ADrawer` 仅剩 `ADrawerFooter` 命名和注释旧代码。
  - 旧业务头部 class 仅剩公共组件自身 `.abi-common-drawer-title-icon`。
- `/usr/local/bin/pnpm --filter chatbi build`：通过。

## 构建警告

- UnoCSS 仍提示无法加载 `selector-popover`、`selector-trigger` 图标。
- Vite 仍提示部分动态/静态导入无法拆 chunk。
- Vite 仍提示部分 chunks 超过 500 kB。
- 以上为既有构建警告，本轮构建成功。

## 过程记录

- `pnpm exec prettier` 因当前 pnpm/lockfile 版本检查失败，并生成临时 `.pnpm-store/`；已清理。
- 改用本地 `node_modules/.bin/prettier` 格式化触达文件。
- 修复一次机械替换导致的多行 icon import 插入位置错误，之后 parse 和 build 均通过。
- 修复 `CommonDrawer` 底层仍透传 `closable` 导致 Ant Design 默认关闭按钮与公共右侧关闭按钮同时出现的问题；底层 Drawer 固定禁用默认关闭按钮，公共组件继续通过 `closable` 控制右侧关闭按钮是否显示。

## 回归检查

- 未修改抽屉业务提交、校验、请求、状态流转逻辑。
- 保留原有 `footer`、业务 `extra`、关闭回调、副作用关闭函数和抽屉尺寸等属性。
- 对 `headerStyle={{ display: 'none' }}` 的全屏助手编辑抽屉，`CommonDrawer` 支持无标题/隐藏头部场景，避免出现双头部。

## AI 系统更新

- 已更新：`.ai/context/UI_STYLE_GUIDE.md`
- 本轮不需要更新：
  - `.ai/prompts/`
  - `.ai/agents/`
  - `.ai/skills/`
  - `.ai/mcp/`
  - `.ai/checklists/`
  - `.ai/decisions/`

## 未解决事项

- 本轮未做浏览器截图回归；已通过构建和静态范围检查。
