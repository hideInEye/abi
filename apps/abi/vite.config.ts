import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import reactRefresh from '@vitejs/plugin-react-refresh';
import { defineConfig, loadEnv } from 'vite';
import qiankun from 'vite-plugin-qiankun';

import { createViteProxy, getBuildTime } from './build/config';
import { include } from './build/optimize';
import { setupVitePlugins } from './build/plugins';

// https://vitejs.dev/config/
export default defineConfig(configEnv => {
  // 是否为开发模式，用于qiankun热更新
  const useDevMode = false;
  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();
  
  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;
  return {
    base: viteEnv.VITE_BASE_URL,
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
    module: {
      rule: {
        test: /\.svg$/,
        use: [
          {
            loader: 'url-loader',
            options: {}
          }
        ]
      }
    },
    optimizeDeps: { include },
    plugins: [
      ...setupVitePlugins(viteEnv, buildTime),
      ...(useDevMode ? [] : [reactRefresh()]),
      qiankun('chatbi', { useDevMode })
    ],
    preview: {
      port: 9725
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
        '~': fileURLToPath(new URL('../../', import.meta.url))
      }
    },
    server: {
      fs: {
        cachedChecks: false
      },
      host: '0.0.0.0',
      open: true,
      port: 9527,
      proxy: {
        ...createViteProxy(viteEnv, enableProxy),
        '/proxy-api': {
          changeOrigin: true,
          rewrite: path => path.replace(/^\/proxy-chat/, ''),
          target: 'http://192.168.1.195:8080'
        }
      },
      warmup: {
        clientFiles: ['./index.html', './src/{pages,components}/*']
      }
    }
  };
});
