import process from 'node:process'
import { URL, fileURLToPath } from 'node:url'

import { defineConfig, loadEnv } from 'vite'

import { createViteProxy, getBuildTime } from './build/config'
import { include } from './build/optimize'
import { setupVitePlugins } from './build/plugins'

// https://vitejs.dev/config/
export default defineConfig(configEnv => {

  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;
  return {
    base: viteEnv.VITE_BASE_URL,
    build: {
      chunkSizeWarningLimit: 1024, // 1MB warning threshold (antd alone is ~1.2MB)
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return;

            // Match exact package paths in node_modules (works for npm/pnpm/yarn)
            const match = (pkg: string) => id.includes(`node_modules/${pkg}/`);

            // React core ecosystem
            if (match('react') || match('react-dom') || match('scheduler')) {
              return 'vendor-react';
            }
            if (match('react-router') || match('react-router-dom') || match('history') || match('path-to-regexp')) {
              return 'vendor-router';
            }
            if (match('@reduxjs/toolkit') || match('react-redux') || match('redux')) {
              return 'vendor-redux';
            }
            if (match('zustand')) {
              return 'vendor-zustand';
            }

            // UI framework (largest chunk)
            if (match('antd') || match('@ant-design/icons') || match('@ant-design/cssinjs') || id.includes('node_modules/rc-')) {
              return 'vendor-antd';
            }

            // Micro-frontend (merge into antd to avoid circular dependency)
            if (match('qiankun') || match('import-html-entry') || match('single-spa')) {
              return 'vendor-antd';
            }

            // Chart libraries
            if (match('echarts')) {
              return 'vendor-echarts';
            }
            if (match('@antv/g6')) {
              return 'vendor-antv-g6';
            }
            if (match('@antv/x6')) {
              return 'vendor-antv-x6';
            }
            if (match('@antv/ava')) {
              return 'vendor-antv-ava';
            }

            // Editors (large, only used in specific pages)
            if (match('monaco-editor') || match('@monaco-editor/react')) {
              return 'vendor-monaco';
            }
            if (match('@codemirror') || match('@uiw/react-codemirror')) {
              return 'vendor-codemirror';
            }

            // Utility libraries
            if (match('lodash')) {
              return 'vendor-lodash';
            }
            if (match('dayjs')) {
              return 'vendor-dayjs';
            }
            if (match('axios')) {
              return 'vendor-axios';
            }
            if (match('ahooks')) {
              return 'vendor-ahooks';
            }

            // i18n
            if (match('i18next') || match('react-i18next')) {
              return 'vendor-i18n';
            }

            // Animation and drag-and-drop
            if (match('framer-motion')) {
              return 'vendor-framer-motion';
            }
            if (match('react-beautiful-dnd') || match('react-dnd') || match('react-dnd-html5-backend')) {
              return 'vendor-dnd';
            }

            // Rich text editor (very large)
            if (match('quill') || match('parchment') || match('quill-delta') || match('quilljs')) {
              return 'vendor-quill';
            }

            // Markdown rendering ecosystem
            if (match('react-markdown') || match('remark-') || match('rehype-') || match('unified') || 
                match('micromark') || match('mdast') || match('hast') || match('vfile') ||
                match('ccount') || match('character-entities') || match('decode-named-character-reference') ||
                match('comma-separated') || match('property-information') || match('space-separated') ||
                match('trim-lines') || match('bail') || match('is-plain-obj') || match('trough') ||
                match('devlop')) {
              return 'vendor-markdown';
            }

            // AntV graphics base (shared by g6/x6)
            if (match('@antv/g') || match('@antv/scale') || match('@antv/coord') || match('@antv/util') ||
                match('@antv/event') || match('@antv/component') || match('gl-matrix')) {
              return 'vendor-antv-base';
            }

            // Other visualization
            if (match('d3-') || match('@berryv/g2-react') || match('@antv/g2')) {
              return 'vendor-d3';
            }

            // Moveable and related (canvas interaction)
            if (match('moveable') || match('selecto') || match('react-selecto') || match('@scena') || 
                match('@egjs') || match('croact') || match('@daybrush/utils')) {
              return 'vendor-moveable';
            }

            // Screenshot and canvas export
            if (match('html2canvas') || match('html-to-image') || match('jspdf')) {
              return 'vendor-export';
            }

            // Crypto and security
            if (match('crypto-js') || match('jsencrypt')) {
              return 'vendor-crypto';
            }

            // Clipboard and copy utilities
            if (match('clipboard') || match('copy-to-clipboard')) {
              return 'vendor-clipboard';
            }

            // Immutable state
            if (match('immer')) {
              return 'vendor-immer';
            }

            // Other utilities
            if (match('react-countup') || match('typeit') || match('sql-formatter')) {
              return 'vendor-utils-extra';
            }
            if (match('json-edit-react')) {
              return 'vendor-json-editor';
            }
            if (match('@microsoft/fetch-event-source')) {
              return 'vendor-sse';
            }
            if (match('@better-scroll/core')) {
              return 'vendor-scroll';
            }
            if (match('react-error-boundary')) {
              return 'vendor-error-boundary';
            }
            if (match('nprogress')) {
              return 'vendor-nprogress';
            }
            if (match('prop-types')) {
              return 'vendor-prop-types';
            }
            if (match('core-js')) {
              return 'vendor-polyfill';
            }
            if (match('qs') || match('query-string')) {
              return 'vendor-querystring';
            }
            if (match('roughjs')) {
              return 'vendor-roughjs';
            }

            // Other third-party libraries: let Rollup decide where to place them
            // This avoids circular dependencies
            return undefined;
          }
        }
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/scss/global.scss" as *;`,
          api: 'modern-compiler'
        }
      }
    },
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    optimizeDeps: { include },
    plugins: [...setupVitePlugins(viteEnv, buildTime)],
    preview: {
      port: 9725,
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('../../', import.meta.url)),
      },
    },
    server: {
      fs: {
        cachedChecks: false,
      },
      host: '0.0.0.0',
      open: true,
      port: 9527,
      proxy: {
        '/api/report-stream': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
        '/chat-ui': {
          target: 'http://localhost:5173',
          changeOrigin: true,
          ws: true,
        },
        ...createViteProxy(viteEnv, enableProxy),
        '/proxy-api': {
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/proxy-chat/, ''),
          target: 'http://192.168.1.195:8080',
        },
        '/api': {
          target: 'https://192.168.1.195/',
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          secure: false,
          // rewrite: (path) => path.replace(/^\/api-proxy/, '/api'),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // console.log('proxyReq', proxyReq, req, res)
            })
          },
        },
        '/chat-proxy': {
          target: 'https://192.168.1.195/',
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // console.log('proxyReq', proxyReq, req, res)
            })
          },
        }, 
        '/abi-chat-proxy': {
          target: 'http://192.168.1.195/',
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/abi-chat-proxy/, '/abi-chat'),
          configure: (proxy, options) => {
            proxy.on('proxyReq', (proxyReq, req, res) => {
              // console.log('proxyReq', proxyReq, req, res)
            })
          },
        },
      },
      warmup: {
        clientFiles: ['./index.html', './src/{pages,components}/*'],
      },
    },
  }
})
