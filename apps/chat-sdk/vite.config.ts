import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import type { Plugin as PostcssPlugin } from 'postcss'
import tailwindcss from 'tailwindcss'
import { defineConfig, type Plugin } from 'vite'

const OUTPUT_NAME = 'abi-assistant-widget'

const GLOBAL_CSS = 'src/chat/index.css'
const SCOPE = ':where(.abi-cw-root)'

/**
 * 把 chat 的全局样式（Tailwind preflight + index.css）收进浮窗作用域，源文件保持与 chat 逐字一致。
 * :where() 不计特异度，层叠关系与 chat 内的裸标签选择器等价；html/body 是页面级装饰，不存在对应节点，直接丢弃。
 */
function scopeGlobalCss(): PostcssPlugin {
  return {
    postcssPlugin: 'abi-widget-scope-global-css',
    // Tailwind 在 Once 阶段展开 @tailwind，这里必须排在它之后
    OnceExit(root, { result }) {
      const from = result.opts.from?.replace(/\\/g, '/') ?? ''
      if (!from.endsWith(GLOBAL_CSS)) return

      root.walkRules((rule) => {
        const parent = rule.parent
        if (parent?.type === 'atrule' && /keyframes$/.test((parent as { name: string }).name)) return

        const selectors = rule.selectors
          .map((s) => s.trim())
          .filter((s) => !/^(html|body)(?![\w-])/.test(s))
          .map((s) => (s === ':root' ? SCOPE : s.startsWith(SCOPE) ? s : `${SCOPE} ${s}`))

        if (selectors.length === 0) rule.remove()
        else rule.selectors = selectors
      })
    },
  }
}

// lib 模式不打包 index.html，产物目录缺入口文件时 nginx 直接 403；这里补一个生产调试页支持整目录独立部署。
const STANDALONE_PAGE = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>ABI 助手悬浮窗 SDK · 接入调试</title>
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        background: #f5f7fa;
        font: 14px/1.5 sans-serif;
      }
      /* 打开按钮由宿主系统自己加（SDK 不再自带悬浮球） */
      .host-open-btn {
        position: fixed;
        right: 24px;
        bottom: 24px;
        z-index: 2147483647;
        padding: 12px 20px;
        border: none;
        border-radius: 24px;
        cursor: pointer;
        background: linear-gradient(135deg, #5b7cf7, #8b5cf6);
        color: #fff;
        box-shadow: 0 6px 20px rgba(91, 124, 247, 0.4);
      }
    </style>
  </head>
  <body>
    <button class="host-open-btn" id="hostOpenBtn" style="display: none">打开 AI 助手</button>
    <script src="./abi-assistant-widget.js"></script>
    <script>
      // 独立部署调试页：shareCode/base 用 URL 参数传入（?shareCode=xxx&base=/api），不写死测试值
      var params = new URLSearchParams(location.search)
      var assistant = document.createElement('abi-assistant')
      assistant.setAttribute('share-code', params.get('shareCode') || '')
      assistant.setAttribute('base', params.get('base') || '/api')
      assistant.setAttribute('theme-switch', '')
      var hostOpenBtn = document.getElementById('hostOpenBtn')
      assistant.addEventListener('close', function () {
        assistant.style.display = 'none'
        hostOpenBtn.style.display = ''
      })
      hostOpenBtn.addEventListener('click', function () {
        assistant.style.display = 'contents'
        hostOpenBtn.style.display = 'none'
      })
      document.body.appendChild(assistant)
    </script>
  </body>
</html>
`

function emitStandalonePage(): Plugin {
  return {
    name: 'abi-widget-emit-standalone-page',
    apply: 'build',
    closeBundle() {
      const distDir = path.join(fileURLToPath(new URL('.', import.meta.url)), 'dist')
      writeFileSync(path.join(distDir, 'index.html'), STANDALONE_PAGE)
    },
  }
}

const chatRoot = fileURLToPath(new URL('./src/chat', import.meta.url))

export default defineConfig({
  // lib 模式默认保留 process.env.NODE_ENV 交给下游打包器；本产物直接在浏览器运行，必须在这里写死
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  resolve: {
    alias: {
      '@': chatRoot,
      '@sa/axios': fileURLToPath(new URL('../../packages/axios/src/index.ts', import.meta.url)),
      '@sa/auth': fileURLToPath(new URL('../../packages/auth/src/index.ts', import.meta.url)),
      '@sa/utils/nanoid': fileURLToPath(new URL('../../packages/utils/src/nanoid.ts', import.meta.url)),
      '@sa/utils': fileURLToPath(new URL('../../packages/utils/src/index.ts', import.meta.url)),
    },
    dedupe: ['react', 'react-dom'],
  },
  esbuild: {
    jsx: 'automatic',
  },
  // 与 apps/chat 对齐：同一份 Tailwind 配置 + 同一份 index.css，再整体收进浮窗作用域不波及宿主页面
  css: {
    postcss: {
      plugins: [tailwindcss, scopeGlobalCss()],
    },
  },
  plugins: [emitStandalonePage()],
  // 仅 dev：调试页 base="/api" 时转发到网关，保持同源免 CORS
  server: {
    port: 5199,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'https://192.168.1.195/',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL('./src/index.ts', import.meta.url)),
      formats: ['iife'],
      name: 'AbiAssistant',
      fileName: () => `${OUTPUT_NAME}.js`,
      cssFileName: OUTPUT_NAME,
    },
    cssCodeSplit: false,
    sourcemap: false,
    target: 'es2019',
    minify: 'esbuild',
  },
})
