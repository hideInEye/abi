# 2026-07-28 ABI 外层大背景与毛玻璃侧边栏对齐 chat

## 需求来源

用户对话指令：确认 chat 的侧边栏/主体外层有一个带大背景渐变的盒子而 ABI 没有后，要求「加一下」——给 ABI 补上这层外层大背景，使侧边栏视觉与 chat 一致。

对应需求：`.ai/requirements/CURRENT_REQUIREMENT.md` 中「2026-07-28 追加：ABI 外层大背景与毛玻璃侧边栏对齐 chat」。

## 背景分析

- chat：外层 `<Layout>`（`apps/chat/src/pages/chat/route.tsx`）刷 `linear-gradient(135deg, #d5daf5 0%, #dfe6f8 45%, #e2d9f3 100%)` + `app-bg-decor` 光斑；侧边栏 `sidebar-glass` 为半透明白 + backdrop-blur，靠透底显色。
- ABI：原侧边栏 `.abi-nav-sider` 为不透明 `var(--abi-card-bg)`；外层无可见大背景。
- 用户已自行将 `.abi-nav-sider` 改为毛玻璃（`rgba(255,255,255,0.38)` + `blur(20px) saturate(1.3)`），本次保留该数值不覆盖。

## 修改内容

1. `apps/abi/src/styles/css/global.css`
   - `body` 增加 `background: linear-gradient(135deg, #d5daf5 0%, #dfe6f8 45%, #e2d9f3 100%)`，与 chat 外层大背景一致。
2. `apps/abi/src/layouts/modules/global-sider/index.scss`
   - `.abi-nav-sider` 背景声明补回 `!important`（`rgba(255, 255, 255, 0.38) !important`），防止 antd `.ant-layout-sider` 默认背景按注入顺序覆盖（原实色版本即依赖 `!important`）。

## 未改动说明

- `.abi-nav-sider` 的毛玻璃数值（0.38 / blur 20px）为用户已有改动，保留。
- `global-sider/index.css` 为 scss 编译产物，未被任何文件引用（仅 `components/star/index.tsx` 引用自己的 index.css），且内容已与 scss 一致，不处理。
- 各页面内容区 `--abi-card-bg` 不透明底色、卡片/抽屉/弹窗背景均未改动。

## 验证

- 静态检查：背景链路 `body → #root → AdminLayout section/aside` 之间无其他背景色遮挡（`bg-layout` 仅出现在未启用的 ThemeDrawer）；毛玻璃 backdrop-filter 可取到 body 渐变。
- 纯 CSS 改动，不涉及类型检查；未运行完整构建（改动不影响 TS 编译产物）。
- 建议人工回归：打开 ABI 首页确认侧边栏透出蓝紫渐变、内容区/卡片/弹窗视觉不变；折叠态与用户下拉菜单正常。

## 风险

- 若后续 antd 主题给 Sider 注入更高优先级背景，需要保持 `!important`。
- 深色模式（若启用）未适配该渐变，当前项目未启用深色模式。

## 是否需要更新长期文档

- `.ai/context/UI_STYLE_GUIDE.md`：如存在背景分层章节，可补充「ABI 与 chat 统一采用外层渐变 + 毛玻璃侧边栏」；本次未改。
- 无需更新 prompts/agents/skills/mcp/checklists/decisions。
