# ABI 助手悬浮窗 SDK 第三方接入指南

> 包名 `@abi/chat-widget`，构建产物为 `abi-assistant-widget.js` + `abi-assistant-widget.css`。
> 第三方系统通过一个 `<script>` 标签 + 一个 `<abi-assistant>` 自定义标签即可把 ABI 智能助手对话面板嵌入自己的页面。

---

## 一、SDK 是什么

- 一个**自包含的对话悬浮面板**，产物为单文件 IIFE JS（已内置 React / ReactDOM / antd / ECharts 等全部运行时依赖），第三方**无需安装任何 npm 依赖**。
- 通过浏览器原生 **Custom Element**（自定义标签 `<abi-assistant>`）挂载，与宿主框架无关（原生 HTML / Vue2 / Vue3 / React / jQuery 均可）。
- 当前形态是**纯弹窗面板**：面板的显示与隐藏由宿主系统自行控制，SDK 不提供打开入口（详见[第六节](#六显隐控制)）。

---

## 二、快速开始（最小接入）

### 第 1 步：引入脚本

```html
<!-- 把「你的ABI地址」替换成你们平台实际的域名或 IP；SDK 文件固定部署在 /chat-sdk/ 路径下 -->
<!-- 只需这一个 script；同目录的 abi-assistant-widget.css 会被自动注入加载 -->
<script src="https://你的ABI地址/chat-sdk/abi-assistant-widget.js"></script>
```

### 第 2 步：放置标签

```html
<!-- share-code 必填；base 填你们 ABI 后端的 API 地址（/api），不填则默认走宿主同源 -->
<abi-assistant share-code="rkh7lyn8" base="https://你的ABI地址/api"></abi-assistant>
```

就这两步，面板即渲染。

> **关于"是不是引入两个文件"：**
> 页面上**只需写 1 个 `<script>`**。JS 加载时会根据脚本自身 URL 自动在同目录追加 `<link rel="stylesheet" href="abi-assistant-widget.css">`，无需手写 CSS。
> 但**服务器上必须同时部署 `.js` 和 `.css` 两个文件（放在同一目录）**，否则样式加载 404。
> 若你希望完全自控，也可以手动引入两个文件（此时 JS 检测到已存在同 href 的 link 就不会重复注入）：
>
> ```html
> <link rel="stylesheet" href="https://你的ABI地址/chat-sdk/abi-assistant-widget.css" />
> <script src="https://你的ABI地址/chat-sdk/abi-assistant-widget.js"></script>
> ```

---

## 三、产物部署（服务端要求）

| 文件 | 说明 | 是否必须 |
| --- | --- | --- |
| `abi-assistant-widget.js` | 主脚本（IIFE，数 MB，已含全部依赖） | 必须 |
| `abi-assistant-widget.css` | 面板样式（约 100–200 KB） | 必须，需与 JS **同目录** |

部署要点：

1. **两个文件放同一目录**：CSS 自动加载逻辑是「取脚本自身 URL 的同目录 `abi-assistant-widget.css`」，目录不一致会 404。
2. **必须经 HTTP(S) 访问**：不要用 `file://` 直接双击打开页面，`origin` 为 `null` 会被 CORS 拒绝。
3. **建议开启 gzip / 缓存**：JS 体积较大，服务端开启 gzip 后传输约 1.8 MB。
4. 将 `dist/` 整目录（含自动生成的 `index.html` 调试页）部署到任意静态目录即可对外提供，本仓库约定部署在 `/chat-sdk/` 路径下（即 `/chat-sdk/abi-assistant-widget.js`）。
5. **安全建议**：优先把 JS/CSS **自托管**在你自己的可信域名下，而非直接引用第三方 CDN。若必须走 CDN，建议为 `<script>` 加上子资源完整性校验（SRI），防止上游被篡改后在你的源内执行任意代码：

   ```html
   <script
     src="https://你的ABI地址/chat-sdk/abi-assistant-widget.js"
     integrity="sha384-<构建产物的哈希>"
     crossorigin="anonymous"></script>
   ```

   哈希可用 `openssl dgst -sha384 -binary abi-assistant-widget.js | openssl base64 -A` 生成；注意每次重新构建后需同步更新 `integrity` 值。

---

## 四、`<abi-assistant>` 标签属性

| 属性 | 必填 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `share-code` | ✅ | string | — | 助手分享码，由 ABI 平台的助手分享功能生成。**缺失时面板不渲染**并在控制台告警。 |
| `base` | ❌ | string | 宿主同源 `window.location.origin` | API 网关基地址。会写入 `window.APP_CONFIG.VITE_BASE_API`。可填完整域名（跨域直连）或相对路径如 `/api`（同源代理）。结尾多余的 `/` 会被自动去除。 |
| `theme` | ❌ | `blue` \| `light` \| `dark` | `blue` | 预设主题风格。非法值自动回退 `blue`。 |
| `theme-switch` | ❌ | 布尔属性 | 不显示 | 写上该属性即在面板头部显示「外观自定义」入口按钮，访客可打开定制抽屉。 |
| `theme-config` | ❌ | JSON 字符串 | 无 | 宿主注入的初始自定义配置（结构见[第七节](#七主题定制)）。非法 JSON 会被忽略并告警。优先级低于接口下发与访客本地自定义。 |

**`base` 的三种典型填法：**

```html
<!-- ① 不填：走宿主页面同源（要求宿主服务端把接口代理到网关） -->
<abi-assistant share-code="rkh7lyn8"></abi-assistant>

<!-- ② 相对路径：同源反向代理，免 CORS -->
<abi-assistant share-code="rkh7lyn8" base="/api"></abi-assistant>

<!-- ③ 完整地址：跨域直连网关（需服务端放行 CORS，见第八节）；换成你们 ABI 地址 -->
<abi-assistant share-code="rkh7lyn8" base="https://你的ABI地址/api"></abi-assistant>
```

---

## 五、事件

| 事件 | 触发时机 | 说明 |
| --- | --- | --- |
| `close` | 访客点击面板右上角关闭按钮 | `CustomEvent`，`bubbles: true`、`composed: true`。SDK 不会自行隐藏面板，由宿主监听该事件后决定如何隐藏 / 移除。 |

```js
document.querySelector('abi-assistant').addEventListener('close', () => {
  // 宿主自行处理，例如隐藏面板、露出自己的打开按钮
})
```

---

## 六、显隐控制

SDK 是纯面板，**标签一放即渲染**。打开入口（按钮等）由宿主自己实现，通过控制 `<abi-assistant>` 的 `display` 来显隐：

```html
<abi-assistant id="abi" share-code="rkh7lyn8" base="/api" style="display: none"></abi-assistant>
<button id="openBtn">打开 AI 助手</button>

<script>
  const widget = document.getElementById('abi')
  const openBtn = document.getElementById('openBtn')

  // 点自己的按钮 -> 显示面板
  openBtn.addEventListener('click', () => {
    widget.style.display = 'contents'
    openBtn.style.display = 'none'
  })

  // 面板 close 事件 -> 隐藏面板、露出按钮
  widget.addEventListener('close', () => {
    widget.style.display = 'none'
    openBtn.style.display = ''
  })
</script>
```

> 说明：元素挂载时内部默认 `display: contents`，让面板脱离标签盒子直接铺到页面；宿主用 `display: none` / `contents` 切换即可。

---

## 七、主题定制

### 7.1 预设主题（`theme`）

- `blue`：品牌蓝系（蓝标题栏 + 浅蓝画布，默认）
- `light`：干净白色系（白底标题栏、近白画布）
- `dark`：黑色系（整套配色反转）

```html
<abi-assistant share-code="rkh7lyn8" base="/api" theme="dark"></abi-assistant>
```

### 7.2 显示「外观自定义」入口（`theme-switch`）

加上该属性后，面板头部出现定制按钮，访客可自行调整并保存在本地：

```html
<abi-assistant share-code="rkh7lyn8" base="/api" theme-switch></abi-assistant>
```

### 7.3 宿主注入初始配置（`theme-config`）

传入 JSON 字符串，按 **背景 / 标题栏 / 字体 / 图表 / 消息** 五个维度覆盖预设。所有字段均可选，非法字段自动忽略。

```html
<abi-assistant
  share-code="rkh7lyn8"
  base="/api"
  theme-config='{
    "background": { "type": "gradient", "color": "#f0f4fb", "color2": "#e6ecf7", "angle": 135 },
    "titleBar":   { "bg": "#5b7cf7", "text": "#ffffff" },
    "font":       { "size": 14, "color": "#1f2733", "weight": 400 },
    "chart":      { "palette": ["#2FA4FF", "#7ACBFF", "#A67AFF"], "textColor": "#333333", "fontSize": 12 },
    "message":    { "cardBg": "#ffffff", "textColor": "#2c3a57", "bubbleColor": "#5b7cf7" }
  }'
></abi-assistant>
```

字段含义：

| 维度 | 字段 | 说明 |
| --- | --- | --- |
| `background` | `type`(`solid`/`gradient`)、`color`、`color2`、`angle` | 画布背景（纯色或渐变） |
| `titleBar` | `bg`、`text` | 标题栏底色与文字/图标色 |
| `font` | `family`、`size`、`color`、`weight` | 正文字体族/字号(px，基准 14)/字色/字重 |
| `chart` | `palette`、`textColor`、`fontFamily`、`fontSize` | 图表系列配色板与文字样式 |
| `message` | `cardBg`、`textColor`、`bubbleColor` | AI 卡片底色、消息文字色、用户气泡色 |

> 优先级：预设变量 < 接口下发配置 < 访客本地自定义；`theme-config` 作为宿主注入的初始值，会被后两者覆盖。

---

## 八、跨域（CORS）必读

SDK 内部接口请求使用 `fetch` 且携带 `Authorization` 头，属于**非简单请求**，会触发浏览器 **CORS 预检（OPTIONS）**。当宿主页面域名与 `base` 网关域名不同源时，**服务端必须放行跨域**，否则接口全部失败。

服务端需返回的响应头（含对 `OPTIONS` 预检的处理）：

```
Access-Control-Allow-Origin: https://第三方站点域名   # 或 *（若不带 cookie）
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

两种规避跨域的方案：

1. **同源反向代理（推荐）**：宿主服务端加一条 `location /api/ { proxy_pass https://你的ABI地址/api/; }`，然后 `base="/api"`，浏览器视为同源，无需 CORS。
2. **本地代理调试**：本仓库 `widget-demo/serve.mjs` 提供了零依赖的静态服务 + 接口转发脚本，`base` 留空即同源，可在服务端未改动前先验证。

---

## 九、完整示例

### 9.1 原生 HTML

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <title>ABI 助手接入示例</title>
  </head>
  <body>
    <button id="openBtn" style="position: fixed; right: 24px; bottom: 24px">打开 AI 助手</button>

    <abi-assistant id="abi" share-code="rkh7lyn8" base="/api" theme="blue" theme-switch style="display: none"></abi-assistant>

    <script src="./abi-assistant-widget.js"></script>
    <script>
      var widget = document.getElementById('abi')
      var openBtn = document.getElementById('openBtn')
      openBtn.addEventListener('click', function () {
        widget.style.display = 'contents'
        openBtn.style.display = 'none'
      })
      widget.addEventListener('close', function () {
        widget.style.display = 'none'
        openBtn.style.display = ''
      })
    </script>
  </body>
</html>
```

### 9.2 Vue2

Vue2 需告诉编译器忽略该自定义标签，且**建议把模板放进 `script type="text/x-template"`**，避免 in-DOM 模板下脚本先于属性升级元素导致的「缺少 share-code」误报。

```html
<div id="app"></div>

<script type="text/x-template" id="app-tpl">
  <abi-assistant share-code="rkh7lyn8" base="/api"></abi-assistant>
</script>

<script src="https://cdn.jsdelivr.net/npm/vue@2/dist/vue.js"></script>
<script src="./abi-assistant-widget.js"></script>
<script>
  Vue.config.ignoredElements = ['abi-assistant']
  new Vue({ el: '#app', template: '#app-tpl' })
</script>
```

### 9.3 React

用 `useEffect` 动态创建标签，卸载时移除：

```jsx
import { useEffect, useRef } from 'react'

export default function AbiWidget() {
  const hostRef = useRef(null)

  useEffect(() => {
    // 确保已在全局引入过 abi-assistant-widget.js
    const el = document.createElement('abi-assistant')
    el.setAttribute('share-code', 'rkh7lyn8')
    el.setAttribute('base', '/api')
    hostRef.current?.appendChild(el)
    return () => el.remove()
  }, [])

  return <div ref={hostRef} />
}
```

> ⚠️ 旧版命令式 API `window.AbiAssistant.init()` 已废弃，请勿再使用，改为上面的自定义标签方式。

---

## 十、本地开发与构建（维护者）

```bash
# 安装依赖（仓库根目录，pnpm workspace）
pnpm install

# 本地开发调试：端口 5199，/api 已代理到网关，改代码热更新
pnpm --filter @abi/chat-widget dev

# 构建产物：dist/abi-assistant-widget.js + .css + index.html（独立调试页）
pnpm --filter @abi/chat-widget build
# 产物仅输出到 dist/，部署到 /chat-sdk/ 对外提供；不再同步到 apps/chat/public/
```

`dist/index.html` 是自包含的独立调试页，支持 URL 参数覆盖：`?shareCode=xxx&base=/api`，可将整个 `dist/` 部署到任意静态目录直接验证。

---

## 十一、常见问题（FAQ）

**Q1：页面没有面板 / 控制台报「缺少 share-code 属性」？**
检查 `<abi-assistant>` 是否设置了 `share-code`；Vue2 in-DOM 模板下请改用 `text/x-template`（见 9.2）。

**Q2：面板出来了但样式错乱 / 无样式？**
`.css` 未与 `.js` 部署在同一目录，自动注入的 `<link>` 404。确认两个文件同目录可访问，或手动引入 CSS。

**Q3：接口全部报跨域错误 / 请求 OPTIONS 失败？**
`base` 网关与宿主不同源且服务端未放行 CORS。按[第八节](#八跨域cors必读)配置响应头，或改用同源代理 `base="/api"`。

**Q4：改了源码但页面没变化？**
构建产物文件名未变时浏览器会缓存旧 JS，请强制刷新（Ctrl+F5）；确认已重新 `build` 且产物同步到了实际部署目录。

**Q5：能双击 HTML 直接看效果吗？**
不能。`file://` 下 `origin` 为 `null` 会被 CORS 拒绝，必须经 `http(s)://` 静态服务访问。
