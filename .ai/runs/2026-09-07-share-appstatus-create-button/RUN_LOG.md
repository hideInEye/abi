# 2026-09-07 分享记录应用状态（appStatus）四态展示与助手创建按钮

## 本轮范围

需求见 `.ai/requirements/CURRENT_REQUIREMENT.md`「2026-09-07 追加」节。本轮落地两块不依赖后端未定参数的改动；`PUT /project/share/status` 同步调用待后端给参数格式后再接。

## 口径结论（与用户/后端多轮确认）

- 分享记录表新增 `app_status: char(1)`：0-已删除 1-启用中 2-已离线 3-编辑中；与分享自身 status、应用自身 status 是三套独立编码。
- 2-已离线 = 产品口径「历史版本」（取消发布/版本下线的结果）；枚举无「离线版本」蓝档（技能版本词汇，助手/大屏不用）。
- 应用自身 status → appStatus 映射：助手 '0'→3、'1'→1、'2'→2；大屏 '0'→1、'1'→3、'2'→2（两域 0/1 相反，同步前必须换算）；删除→0。
- 创建按钮常显（与保存/发布并列，非只读）：点击调现有 `updateAppApi`（POST /api/abi-chat/v1/app/update）全量 payload、status='2'（历史版本），同步 appStatus=2；不新增接口。（用户确认语义为“点创建后状态变历史版本”，非“历史版本态才显示”。）
- 同步写入走方案A：现有 PUT 改一次传多个 shareCode；前端每次点击 = 1 次列表（收集该应用 shareCode）+ 1 次更新。已知代价与风险记录于下「待办与风险」。

## 修改文件

- `apps/abi/src/pages/workbench/app-workshop/my-assistant/ShareRecordList.tsx`：`getShareStatus` 优先读 `appStatus ?? app_status` 四态映射（3 编辑中 draft 橙 / 1 当前启用 绿 / 2 历史版本 off 灰 / 0 已删除 off 灰），过期优先逻辑不变，缺失回落旧 status 猜测；`statusOff` 字段改为 `statusCls` 修饰类。
- `apps/dashboard/src/pages/my-screen/ShareRecordList.tsx`：同上口径同步修改。
- `apps/dashboard/src/pages/home/project-list/ProjectList.less`：`.ac-tag` 补 `&.draft` 橙（对齐 abi table.scss 与产品四态配色）。
- `apps/abi/src/pages/workbench/assistant-manage/assistant-config/modules/assistant-edit-drawer.tsx`：`handleSave` 增加 `successText` 参数（默认「已保存」）；头部在 `status==='2'` 且非只读时渲染「创建」按钮，点击 `handleSave('已创建')`；保存按钮 onClick 改箭头函数包裹，避免点击事件误作 successText 入参。
- `.ai/requirements/CURRENT_REQUIREMENT.md`：追加本轮需求节。

## 验证

- `pnpm --filter chatbi typecheck`：改动文件（ShareRecordList、assistant-edit-drawer）无报错；其余为仓库既有基线错误（packages/*、build 配置、router/elegant 等）。首轮曾引入 1 个新错（onClick={handleSave} 事件入参 TS2322），已改 `onClick={() => handleSave()}` 修复并复跑确认消失。
- `apps/dashboard` 下 `npx tsc --noEmit --skipLibCheck`：仅 ProjectList.tsx 既有错（dayjs 类型缺失、未使用变量），与本轮修改的 .less / ShareRecordList.tsx 无关。
- 行为等价说明：appStatus 缺失时展示逻辑与改前逐行一致（同一条 fallback 分支）；保存按钮行为不变（仅包裹箭头函数）；创建按钮为纯新增渲染分支，其他状态不渲染。

## 2026-09-08 同步接线（助手侧 appStatus）

- `apps/abi/src/service/api/share.ts`：新增 `updateShareStatusApi`（PUT /project/share/status，shareCodes 以重复 query key 传多个 `?shareCodes=a&shareCodes=b` + appStatus；手动拼 query 避免 axios 数组序列化带 [] 后缀）与 `syncShareAppStatus`（单次拉分享列表 current=1/size=999 → filter `projectId` 命中 → 收集 shareCode 一次 PUT；无分享记录不发请求；内部吞错仅 console）。字段已经真实返回确认：行内 `projectId`(=appId) 与驼峰字符串 `appStatus` 均命中。注：曾误将分享展示页自身分页返回（pageSize=10）当作同步拉列表被封顶，一度改逐页翻页，经用户澄清后改回单次 size=999。
- 落点接线（操作成功后 fire-and-forget 调 `syncShareAppStatus`，type='workflow'）：编辑抽屉 handleSave（保存 '0'→3 / 创建 '2'→2）、handlePublish（→1）；assistant-config handleToggle（ON→1 / OFF→2）、handleDelete（→0）、handleBatchDelete（逐 id→0）；my-assistant handleOffline（→2，且 await 同步完成后 bump shareRefreshToken 刷新同页分享记录 tab）。
- 创建按钮语义修正：去掉 `status==='2'` 显示条件改常显；handleSave 增加 `nextStatus` 参数（保存 '0' / 创建 '2'）复用同一提交。
- 验证：`pnpm --filter chatbi typecheck` 改动四文件无新增报错（assistant-config/index.tsx:457、assistant-config-drawer、routes.ts 等为既有基线）。

## 2026-09-08 大屏对接（dashboard appStatus）

- `apps/dashboard/src/utils/FetchUtil.ts`：补 `put`（query 传参无 body，dashboard 原只有 get/post）。
- `apps/dashboard/src/api/BaseApi.ts`：加 `updateShareStatus`（PUT /project/share/status，shareCodes 重复 query key + appStatus，与助手侧同格式）与 `syncShareAppStatus`（复用 getShareProjectList type='dashboard' current=1/size=999 → filter projectId → 一次 PUT；fire-and-forget 吞错）。
- 落点接线（大屏 status→appStatus 映射，不动 ProjectState 枚举）：HotKeyImpl `doSave`（保存 status'1'→3）、DesignerHeader `handlePublish`（发布 status'0'→1）、ProjectList `confirmDel`/`handleBatchDelete`（删除→0）。
- 取消发布落点在 MyScreen.tsx confirmUnpublish（status'2'→appStatus2）；初版误判「大屏无取消发布入口」（只搜了 ProjectList）漏接，已补。
- 验证：`apps/dashboard` 下 `npx tsc --noEmit` 改动五文件无新增报错（DesignerHeader ProjectState unused import、ProjectList dayjs 模块/title unused 均为既有基线）。

## 2026-09-08 大屏弹窗状态按后端 status 统一

- 根因：项目设置弹窗（ProjectHdItemImpl）编辑的是前端 `state`（ProjectState 枚举），但 doSave 只 updateProjectConfig（本地 store）不持久化、列表读后端 `status`，故弹窗选状态对列表无任何影响（state 是脱节死字段）。
- 修复（按后端来，与助手侧单一 status 一致）：弹窗 Radio 改编辑后端 `status`（options 值用后端编码 '0'当前启用/'1'编辑中/'2'历史版本，显示顺序不变零视觉变化）；doSave 新增 `baseApi.updateProject({id, status})` 持久化（partial 更新，不动 dataJson/name/des），成功后按大屏映射同步分享记录 appStatus（'0'→1/'2'→2/其余→3）。
- ProjectHdItemImpl 删除 unused `ProjectState` import；ProjectState 枚举定义与 IProjectInfo.state 字段保留未删（EditorDesignerLoader 仍引用，避免牵连），state 自此为纯遗留字段不再被编辑。
- 验证：`apps/dashboard` 下 `npx tsc --noEmit` ProjectHdItemImpl 无报错。

## 2026-09-08 弹窗保存按钮修复 + ProjectState 清理

- bug 根因（用户实测「没调状态接口」）：项目设置弹窗保存按钮是 antd Button（htmlType 默认 'button' 非 submit），点击不触发 `<form onSubmit={doSave}>`，doSave 从未执行 → updateProject/同步接口都不调。属既有缺陷（弹窗保存一直是摆设）。
- 修复：保存按钮改 onClick={doSave} 直接触发；doSave 参数 FormEvent→SyntheticEvent 兼容 onClick 的 MouseEvent（form onSubmit 保留，回车仍可提交）。
- ProjectState 枚举彻底清理（用户要求）：删 DesignerType.ts 枚举定义 + IProjectInfo.state 字段；删 EditorDesignerLoader（import + state 赋值行）、ProjectManager（import + state 初始化行）、DesignerHeader（unused import）三处引用。state 字段自此不存在，全链路只用后端 status。
- 验证：apps/dashboard npx tsc --noEmit 改动文件无报错、无 'state' 残留引用（DesignerHeader 原 ProjectState unused 基线报错随 import 删除消失）。

## 2026-09-08 大屏同步 spaceId 修复 + 取消发布补接

- 用户实测大屏发布/保存/取消发布均不调 PUT /project/share/status。真因：BaseApi.syncShareAppStatus 调 getShareProjectList 未传 spaceId，而后端 share/list 需 spaceId 过滤（展示页 ShareRecordList 拉列表传 Number(localStorage spaceId) 才能显示记录），不传则返回空 → codes 空 → 提前 return 不发 PUT。
- 修复：syncShareAppStatus 补 spaceId（localStorage.getItem('spaceId')，与展示页一致）。
- 取消发布漏接补上：初版误判「大屏无取消发布入口」（只搜了 ProjectList），实际在 MyScreen.tsx confirmUnpublish（updateProject status'2'），已接 syncShareAppStatus(id, 2)。
- 验证：apps/dashboard npx tsc --noEmit MyScreen/BaseApi 无新增报错（dayjs 为既有基线）。

## 2026-09-08 项目设置弹窗淡色样式适配（用户纠正方向）

- 弹窗入口：编辑器内按 Ctrl+1（HotKeyConfig 'control+1'→toggleProjectConfig）。
- **用户明确要淡色**（对齐画布设置/主题设置那种白底弹窗）；初版误按 Dialog 暗色硬编码做了暗色适配，方向反了，已重写。
- Dialog 默认 header #26292e / content #1b1e23 暗色，用 `.lc-dialog.lc-header-project-set`（双类提特异性压过 Dialog.less）覆盖为 `.dialog-header` #f2f3f5 + `.dialog-content` #fff 转白底。
- **关键**：antd Input/Radio/Select 默认即亮色白底，容器转白后无需逐个覆盖控件（删掉初版全部暗色控件覆盖，做减法）；UIContainer label 本就 color:#555 暗字，白底可见。footer 白底 + 浅分隔线 #f0f0f0。
- tsx 两处（与配色无关的功能修复，保留）：①存储类型 Select options value '1'→SaveType.LOCAL（'0'），修复收起态显示 raw '0'；②取消 Button type='default'（白底暗字边次要样式，与 primary 保存区分）。
- 教训：弹窗配色先确认项目主色调（画布/主题设置是白底亮色），别看到 Dialog 组件暗色就往暗色做。
- 验证：tsc 无新增报错（10 个均为 dashboard 既有遗留：dayjs/unused/MenuClickEventHandler）。

## 2026-09-09 项目设置弹窗淡色细节优化

- 用户反馈「白色了但丑」。根因：Dialog.less 的 `.dialog-body` 无宽度，弹窗宽被内容固有宽撑开（shrink-to-fit），输入框/Select 填不满格子显得宽窄不一、整体 830px 过宽松散；header #f2f3f5 灰条与白内容割裂；无圆角阴影；行高字号不统一。
- less 优化：body 固定 560px（antd Modal 常规宽）+ border-radius 8px + overflow hidden + 阴影；header 改白底 + 1px #f0f0f0 下分隔、标题 15px/600、关闭 #999 hover #333；content padding 20px 24px 0；表单行高统一 32px、字号 13px、label #666；footer 1px 上分隔拉通内容边（margin 20px -24px 0）、按钮 32px 高 4px 圆角。
- tsx：按钮顺序换惯例「取消左、保存右」（原保存左取消右）。
- 追修（用户截图右侧露灰块）：Dialog.tsx 的 `.dialog-content` 带内联 `style={{width}}`（prop 默认 400），less 强设 body 宽 560 比 content 400 宽，透明差值露出 mask 灰。改传 Dialog 组件自带 `width={560}` prop（控制 content 内联宽），删 less 强设 body 宽，body auto 跟随 content，灰块消失。
- 验证：tsc 无新增报错（dashboard 既有 10 个遗留不变）。

## 待办与风险（同步接线轮）

- 已定：① 传参格式 = shareCodes 重复 query key（`?shareCodes=a&shareCodes=b&appStatus=1`，用户最终确认，取代早前逗号分隔方案）；④ 删除同步由前端 delete 成功后调同一接口传 0（幂等，即便后端 delete 内自写也不冲突）。仍待后端白纸黑字：② 列表行“属于哪个应用”字段名（当前按 `projectId` 接，与创建分享入参一致，密码字段曾踩坑）；③ 列表行 appStatus 字段名（当前 `appStatus`/`app_status` 双名兼容读，确认后收敛单名）。
- 漏记风险接受现状：同步拉列表 size=999 单次拉全量（用户确认同步接口 size 生效；早前 pageSize=10 返回实为分享展示页自身分页，非同步接口封顶）。若将来分享记录超 999 或后端封顶再改翻页/appId+type 新接口。
- 大屏对接已接保存/发布/删除/取消发布四落点（取消发布在 MyScreen confirmUnpublish，初版漏搜已补）；「创建」大屏无对应入口（发布按钮已发布态禁用），待产品确认。技能管理卡片状态词统一仍未在本轮范围，待产品确认另立需求。
- 既有缺陷已修（2026-09-08，按后端来）：dashboard 弹窗状态对不上列表，根因是弹窗编辑前端 state（doSave 不持久化）而列表读后端 status；已改为弹窗编辑 status + doSave 持久化 + 同步 appStatus。另修弹窗保存按钮 antd htmlType='button' 不触发 form submit 导致 doSave 从未执行的既有缺陷（改 onClick）。ProjectState 枚举/IProjectInfo.state 已彻底删除（DesignerType + EditorDesignerLoader/ProjectManager/DesignerHeader 三处引用），全链路只用后端 status。

## AI 系统更新判断

- `context/`：分享三套状态编码与映射表、方案A同步链路属稳定项目事实，建议后续并入 MODULE_MAP 或新建分享模块事实页（本轮先记 run log，避免与未定参数耦合）。
- `prompts/`/`agents/`/`skills/`/`mcp/`/`checklists/`/`decisions/`：暂无需更新。
