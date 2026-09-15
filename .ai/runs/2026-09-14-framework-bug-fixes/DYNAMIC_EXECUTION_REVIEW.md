# P0-03 动态执行安全复核

## 信任边界

Dashboard 的数据过滤、蓝图处理、图表和地图配置会从已保存项目中恢复，并可能在编辑、预览或分享场景被其他用户打开。因此持久化配置不能被当作与当前浏览者同等可信的宿主 JavaScript；它不得获得 DOM、storage、token 或任意同源请求能力。

## Source → Transform → Sink

| 配置来源 | 受控转换 | 最终 sink | 失败行为 |
| --- | --- | --- | --- |
| JSON Schema 可见条件 | 条件 DSL 解析和字段路径白名单 | 布尔可见性 | 不执行旧脚本，返回迁移错误 |
| API/数据库数据过滤配置 | 数据转换 DSL：select/filter/limit/sort | 纯数据变换 | 不进入 `changeData`，显示错误 |
| 蓝图条件节点 | 条件 DSL | 分支选择 | 停止节点执行，显示错误 |
| 蓝图逻辑处理节点 | 数据转换 DSL | 下游参数 | 停止节点执行，显示错误 |
| 自定义 G2Plot 配置 | 图表类型注册表 + JSON options 校验 | 已登记的 Plot 构造器 | 未登记类型和旧代码拒绝执行 |
| AMap 配置 | JSON schema/有限字段运行时校验 | AMap options | 非法字段和旧代码拒绝执行 |
| Chat Markdown | ReactMarkdown + GFM | React 元素 | 不写入原始 HTML |
| Chat 报表 HTML | 追加严格 CSP | `sandbox=""` iframe `srcDoc` | iframe 无脚本、网络、frame、对象和表单能力 |

## 防绕过措施

1. 禁止属性路径 `__proto__`、`prototype`、`constructor`，避免原型链逃逸。
2. 图表只允许显式登记的 area、bar、bidirectional-bar、column、line、pie；使用 own-property 判定，`__proto__` 不能命中注册表。
3. 地图配置校验 center、zoom、pitch、rotation 等数值及 2D/3D 枚举，不把字符串解释为代码。
4. 旧任意 JavaScript 只允许识别无副作用的简单 identity 迁移，其余配置给出可见迁移失败，不静默执行。
5. 报表文档即使自带宽松 CSP，也会叠加本地严格 CSP；多个 CSP 同时存在时只能进一步收紧权限。
6. 三应用 lint 配置禁止 `eval`、`new Function` 和字符串 timer。

## 残余 HTML/Blob 使用

- Chat `AttributionDashboard`、ABI `DataAssets`、ABI `FastCreate` 的 `dangerouslySetInnerHTML` 仅接收模块内声明的静态 SVG 常量，不经过接口、storage 或用户输入。
- Blob/ObjectURL 仅用于 zip/csv/文件/图片下载和预览，不作为 Worker、script URL 或动态模块来源。
- 报表 `srcDoc` 是唯一仍接收服务端 HTML 的 sink，已由空 sandbox 权限与严格 CSP 双重限制。

## 最终扫描结果

生产 TypeScript/JavaScript 源码扫描结果：

- `eval`：0
- `new Function`：0
- 字符串 timer：0
- 动态 script 注入：0
- `new WebSocket`：0
- 非字面量动态 import：0

## 测试

- `runtime-config.test.ts`：覆盖 DSL 正常执行、旧脚本拒绝和危险属性路径拒绝。
- `renderer-registry.test.ts`：覆盖白名单构造、`__proto__` 类型拒绝和非法地图参数拒绝。
- `safeHtmlDocument.test.ts`：覆盖严格 CSP 注入和已有 CSP 时继续叠加限制。
- Dashboard 与 Chat 生产构建通过。

## 结论

本轮识别出的运行时字符串代码执行路径已替换为受控配置模型，未通过字符串关键字过滤或 `new Function` 等等价机制绕过。当前静态源码范围内没有可从持久化配置进入宿主 JavaScript 执行环境的已知路径。
