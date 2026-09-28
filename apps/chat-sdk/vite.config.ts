import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import type { Plugin as PostcssPlugin } from 'postcss'
import tailwindcss from 'tailwindcss'
import { defineConfig, type Plugin } from 'vite'

const OUTPUT_NAME = 'abi-assistant-widget'
const ARTIFACTS = [`${OUTPUT_NAME}.js`, `${OUTPUT_NAME}.css`]

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

/** 构建产物同步到 chat/public，使 Chat 正常构建即可对外提供 JS + CSS */
function copyArtifacts(): Plugin {
  return {
    name: 'abi-widget-copy-artifacts',
    apply: 'build',
    closeBundle() {
      const rootDir = fileURLToPath(new URL('.', import.meta.url))
      const distDir = path.join(rootDir, 'dist')

      const targetDir = fileURLToPath(new URL('../chat/public', import.meta.url))
      if (!existsSync(targetDir)) return

      mkdirSync(targetDir, { recursive: true })
      for (const file of ARTIFACTS) {
        const src = path.join(distDir, file)
        if (existsSync(src)) copyFileSync(src, path.join(targetDir, file))
      }
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
  plugins: [copyArtifacts()],
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
