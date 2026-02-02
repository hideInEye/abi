# 03｜中期结构性调整（模块边界/目录治理/状态与数据流）

> 时间尺度：2~6 周（可拆分为多个迭代）。目标是降低“改一处炸一片”的风险，提升扩展性与可维护性。

## 1. 目录结构：从“按技术类型”走向“按业务域/feature”

### 现状痛点

- `apps/abi/src/pages/**` 下沉积了大量“可复用类型/逻辑”，导致：
  - service 层依赖 pages types（跨层）
  - components 依赖 pages 内部实现（跨模块）
- 维护者需要“全局搜索”才能定位一个业务改动所需文件

### 目标结构（示例）

- `src/features/<domain>/`：一个业务域自闭环
  - `api.ts`（该域 API）
  - `types.ts`（该域类型）
  - `components/`（该域组件）
  - `stores/`（该域状态）
  - `pages/`（路由页面入口，仅负责组装）
- `src/shared/`：真正无业务含义的共享（utils、基础组件、基础 hooks）
- `src/infra/`：基础设施（request、router、i18n、monitoring）

### 迁移策略（不推倒重来）

- 先选 1~2 个改动频繁/耦合严重的域做试点（如 `data-preparation`、`assistant-manage`）
- 通过 **“新代码进新目录、旧代码渐进迁移”** 控制风险

## 2. 模块边界与依赖方向（强约束）

### 必须遵守的单向依赖

- `features/*` → `shared/*` → `infra/*`（依赖方向由上到下）
- `service/api/*` 不得依赖 `pages/*`（类型也不行）
- `apps/*` 不得依赖 `packages/*/src`（只能依赖 `packages/*` exports）

### 工具化落地

- ESLint：`no-restricted-imports` + `import/no-cycle` + `boundaries`（可选）
- TS：考虑开启 project references（按 app/package 拆分）提升增量编译与边界约束

## 3. 状态管理策略收敛

### 建议策略

- `apps/abi`：继续以 Redux Toolkit 为主（已有 slice 体系）
  - 严禁新增“又一套 store”（如 `createApp({models})` 这种需明确去留）
  - Zustand 仅用于“UI 临时态/局部可复用 store”，并明确目录（如 `features/*/stores`）
- `apps/chat`：
  - 若 Redux 已废弃：删除 Redux store/切片
  - 若 Redux 仍需要：恢复 Provider，并建立“缓存策略/序列化策略”

### 数据流治理

- 对话页类重逻辑组件（如 `apps/chat/src/pages/conversation/index.tsx`）建议拆分为：
  - `useConversationController`（请求与状态机）
  - `MessageList`（渲染，支持虚拟列表）
  - `Composer`（输入与附件）
  - `DebugPanel`（懒加载）

## 4. 权限与菜单模型统一

### 目标

- **路由权限、菜单权限、按钮权限** 共享同一权限实体（role/permission key）
- “后端菜单”与“前端路由”通过明确的映射层转化，而不是散落在 slice/guard/utils

### 落地建议

- 定义 `AuthContext`（包含 userId、roles、permissions、tenant/spaceId 等）
- 在登录后把后端 `user` 结构归一化，避免 `roles` 一会儿 string、一会儿 object
- `route.meta.roles` 约定为 `string[]`（RoleKey）并由转换层保证正确

