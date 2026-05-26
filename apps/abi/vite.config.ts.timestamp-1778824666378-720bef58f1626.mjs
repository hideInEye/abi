// vite.config.ts
import process3 from "node:process";
import { URL, fileURLToPath } from "node:url";
import { defineConfig, loadEnv } from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/vite@5.4.10_@types+node@22.8.6_less@4.5.1_lightningcss@1.30.2_sass@1.80.6_terser@5.44.1/node_modules/vite/dist/node/index.js";

// src/utils/service.ts
import json5 from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/json5@2.2.3/node_modules/json5/lib/index.js";
function createServiceConfig(env) {
  const { VITE_CHAT_SERVICE_BASE_URL, VITE_OTHER_SERVICE_BASE_URL, VITE_SERVICE_API_URL, VITE_SERVICE_BASE_URL } = env;
  let other = {};
  try {
    other = json5.parse(VITE_OTHER_SERVICE_BASE_URL);
  } catch {
    console.error("VITE_OTHER_SERVICE_BASE_URL is not a valid json5 string");
  }
  const httpConfig = {
    apiURL: VITE_SERVICE_API_URL,
    baseURL: VITE_SERVICE_BASE_URL,
    chatURL: VITE_CHAT_SERVICE_BASE_URL,
    other
  };
  const otherHttpKeys = Object.keys(httpConfig.other);
  const otherConfig = otherHttpKeys.map((key) => {
    console.log("otherConfig key=", key, "; url=", httpConfig.other[key]);
    return {
      apiURL: httpConfig.apiURL,
      baseURL: httpConfig.other[key],
      chatURL: httpConfig.chatURL,
      key,
      proxyPattern: createProxyPattern(key)
    };
  });
  const config = {
    apiURL: httpConfig.apiURL,
    baseURL: httpConfig.baseURL,
    chatURL: httpConfig.chatURL,
    other: otherConfig,
    proxyPattern: createProxyPattern()
  };
  return config;
}
function createProxyPattern(key) {
  if (!key) {
    return "/proxy-default";
  }
  return `/proxy-${key}`;
}

// build/config/proxy.ts
function createViteProxy(env, enable) {
  const isEnableHttpProxy = enable && env.VITE_HTTP_PROXY === "Y";
  if (!isEnableHttpProxy) return void 0;
  const { apiURL, baseURL, other, proxyPattern } = createServiceConfig(env);
  const proxy = createProxyItem({ apiURL, baseURL, proxyPattern });
  other.forEach((item) => {
    Object.assign(proxy, createProxyItem(item));
  });
  return proxy;
}
function createProxyItem(item) {
  const proxy = {};
  proxy[item.proxyPattern] = {
    changeOrigin: true,
    rewrite: (path3) => path3.replace(new RegExp(`^${item.proxyPattern}`), ""),
    target: item.baseURL
  };
  return proxy;
}

// build/config/time.ts
import dayjs from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/dayjs@1.11.13/node_modules/dayjs/dayjs.min.js";
import timezone from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/dayjs@1.11.13/node_modules/dayjs/plugin/timezone.js";
import utc from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/dayjs@1.11.13/node_modules/dayjs/plugin/utc.js";
function getBuildTime() {
  dayjs.extend(utc);
  dayjs.extend(timezone);
  const buildTime = dayjs.tz(Date.now(), "Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss");
  return buildTime;
}

// build/optimize/index.ts
var include = ["ahooks", "echarts", "i18next", "lodash", "immer", "react-i18next"];

// build/plugins/index.ts
import react from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/@vitejs+plugin-react@4.3.3_vite@5.4.10_@types+node@22.8.6_less@4.5.1_lightningcss@1.30.2_sass@1.80.6_terser@5.44.1_/node_modules/@vitejs/plugin-react/dist/index.mjs";
import Inspect from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/vite-plugin-inspect@0.8.7_rollup@4.55.1_vite@5.4.10_@types+node@22.8.6_less@4.5.1_lightningcs_p5ezd2lobsh22r6hra2pjwovwq/node_modules/vite-plugin-inspect/dist/index.mjs";
import removeConsole from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/vite-plugin-remove-console@2.2.0/node_modules/vite-plugin-remove-console/dist/index.mjs";

// build/plugins/auto-import.ts
import AutoImport from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/unplugin-auto-import@0.18.3_rollup@4.55.1/node_modules/unplugin-auto-import/dist/vite.js";
import IconsResolver from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/unplugin-icons@0.20.0_@svgr+core@8.1.0_typescript@5.6.3__@vue+compiler-sfc@3.5.26/node_modules/unplugin-icons/dist/resolver.js";
function setupAutoImport(viteEnv) {
  const { VITE_ICON_LOCAL_PREFIX, VITE_ICON_PREFIX } = viteEnv;
  const collectionName = VITE_ICON_LOCAL_PREFIX.replace(`${VITE_ICON_PREFIX}-`, "");
  return AutoImport({
    dirs: ["src/hooks/**", "src/components/**"],
    dts: "src/types/auto-imports.d.ts",
    imports: ["react", "react-router-dom", "react-i18next", "ahooks", { from: "react", imports: ["FC"], type: true }],
    include: [/\.[tj]sx?$/],
    resolvers: [
      IconsResolver({
        componentPrefix: VITE_ICON_PREFIX,
        customCollections: [collectionName],
        extension: "tsx",
        prefix: VITE_ICON_PREFIX
      }),
      autoImportAntd
    ]
  });
}
function autoImportAntd(componentName) {
  const pattern = /^A[A-Z]/;
  if (pattern.test(componentName)) {
    return { from: "antd", name: componentName.slice(1) };
  }
  return null;
}

// build/plugins/html.ts
function setupHtmlPlugin(buildTime) {
  const plugin = {
    apply: "build",
    name: "html-plugin",
    transformIndexHtml(html) {
      return html.replace("<head>", `<head>
    <meta name="buildTime" content="${buildTime}">`);
    }
  };
  return plugin;
}

// build/plugins/router.ts
import ElegantReactRouter from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/@ohh-889+react-auto-route@0.3.5/node_modules/@ohh-889/react-auto-route/dist/vite.mjs";
function setupElegantRouter() {
  return ElegantReactRouter({
    customRoutes: {
      names: [
        "exception_403",
        "exception_404",
        "exception_500",
        // 'document_project',
        // 'document_project-link',
        // 'document_react',
        // 'document_vite',
        // 'document_unocss',
        // 'document_proComponents',
        // 'document_antd',
        "logout"
      ]
    },
    layouts: {
      base: "src/layouts/base-layout/index.tsx",
      blank: "src/layouts/blank-layout/index.tsx"
    },
    log: false,
    onRouteMetaGen(routeName) {
      const key = routeName;
      const constantRoutes = ["login", "403", "404", "500"];
      const meta = {
        i18nKey: `route.${key}`,
        title: key
      };
      if (constantRoutes.includes(key)) {
        meta.constant = true;
      }
      return meta;
    }
  });
}

// build/plugins/unocss.ts
import path from "node:path";
import process from "node:process";
import { FileSystemIconLoader } from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/@iconify+utils@2.3.0/node_modules/@iconify/utils/lib/loader/node-loaders.mjs";
import presetIcons from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/@unocss+preset-icons@0.63.6/node_modules/@unocss/preset-icons/dist/index.mjs";
import unocss from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/@unocss+vite@0.63.6_rollup@4.55.1_typescript@5.6.3_vite@5.4.10_@types+node@22.8.6_less@4.5.1__ijyr5y3bjk4f36v2lqenyjslbm/node_modules/@unocss/vite/dist/index.mjs";
function setupUnocss(viteEnv) {
  const { VITE_ICON_LOCAL_PREFIX, VITE_ICON_PREFIX } = viteEnv;
  const localIconPath = path.join(process.cwd(), "src/assets/svg-icon");
  const collectionName = VITE_ICON_LOCAL_PREFIX.replace(`${VITE_ICON_PREFIX}-`, "");
  return unocss({
    theme: {
      breakpoints: {
        sm: "640px",
        md: "768px",
        lg: "1024px",
        xl: "1280px",
        "2xl": "1536px"
      }
    },
    presets: [
      presetIcons({
        collections: {
          [collectionName]: FileSystemIconLoader(
            localIconPath,
            (svg) => svg.replace(/^<svg\s/, '<svg width="1em" height="1em" ')
          )
        },
        extraProperties: {
          display: "inline-block"
        },
        prefix: `${VITE_ICON_PREFIX}-`,
        scale: 1,
        warn: true
      })
    ]
  });
}

// build/plugins/unplugin-icon.ts
import path2 from "node:path";
import process2 from "node:process";
import { FileSystemIconLoader as FileSystemIconLoader2 } from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/unplugin-icons@0.20.0_@svgr+core@8.1.0_typescript@5.6.3__@vue+compiler-sfc@3.5.26/node_modules/unplugin-icons/dist/loaders.js";
import Icons from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/unplugin-icons@0.20.0_@svgr+core@8.1.0_typescript@5.6.3__@vue+compiler-sfc@3.5.26/node_modules/unplugin-icons/dist/vite.js";
import { createSvgIconsPlugin } from "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/node_modules/.pnpm/vite-plugin-svg-icons@2.0.1_vite@5.4.10_@types+node@22.8.6_less@4.5.1_lightningcss@1.30.2_sass@1.80.6_terser@5.44.1_/node_modules/vite-plugin-svg-icons/dist/index.mjs";
function setupUnPluginIcon(viteEnv) {
  const { VITE_ICON_LOCAL_PREFIX, VITE_ICON_PREFIX } = viteEnv;
  const localIconPath = path2.join(process2.cwd(), "src/assets/svg-icon");
  const collectionName = VITE_ICON_LOCAL_PREFIX.replace(`${VITE_ICON_PREFIX}-`, "");
  const plugins = [
    createSvgIconsPlugin({
      // customDomId: '__SVG_ICON_LOCAL__',
      iconDirs: [localIconPath],
      inject: "body-last",
      symbolId: `${VITE_ICON_LOCAL_PREFIX}-[dir]-[name]`
    }),
    Icons({
      compiler: "jsx",
      customCollections: {
        [collectionName]: FileSystemIconLoader2(
          localIconPath,
          (svg) => svg.replace(/^<svg\s/, '<svg width="1em" height="1em" ')
        )
      },
      defaultClass: "inline-block",
      jsx: "react",
      scale: 1
    })
  ];
  return plugins;
}

// build/plugins/index.ts
function setupVitePlugins(viteEnv, buildTime) {
  const plugins = [
    react(),
    setupAutoImport(viteEnv),
    setupUnocss(viteEnv),
    ...setupUnPluginIcon(viteEnv),
    setupElegantRouter(),
    Inspect(),
    removeConsole(),
    setupHtmlPlugin(buildTime)
  ];
  return plugins;
}

// vite.config.ts
var __vite_injected_original_import_meta_url = "file:///Users/kangxz/Software/trust-abi/trust-abi-frontend/apps/abi/vite.config.ts";
var vite_config_default = defineConfig((configEnv) => {
  const viteEnv = loadEnv(configEnv.mode, process3.cwd());
  const buildTime = getBuildTime();
  const enableProxy = configEnv.command === "serve" && !configEnv.isPreview;
  return {
    base: viteEnv.VITE_BASE_URL,
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/scss/global.scss" as *;`,
          api: "modern-compiler"
        }
      }
    },
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    optimizeDeps: { include },
    plugins: [...setupVitePlugins(viteEnv, buildTime)],
    preview: {
      port: 9725
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)),
        "~": fileURLToPath(new URL("../../", __vite_injected_original_import_meta_url))
      }
    },
    server: {
      fs: {
        cachedChecks: false
      },
      host: "0.0.0.0",
      open: true,
      port: 9527,
      proxy: {
        ...createViteProxy(viteEnv, enableProxy),
        "/proxy-api": {
          changeOrigin: true,
          rewrite: (path3) => path3.replace(/^\/proxy-chat/, ""),
          target: "http://192.168.1.252:8080"
        },
        "/api": {
          target: "https://192.168.1.252/",
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          secure: false,
          // rewrite: (path) => path.replace(/^\/api-proxy/, '/api'),
          configure: (proxy, options) => {
            proxy.on("proxyReq", (proxyReq, req, res) => {
            });
          }
        },
        "/chat-proxy": {
          target: "https://192.168.1.252/",
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          secure: false,
          configure: (proxy, options) => {
            proxy.on("proxyReq", (proxyReq, req, res) => {
            });
          }
        },
        "/abi-chat-proxy": {
          target: "http://192.168.1.252/",
          // target: 'http://123.181.192.131:81/',
          changeOrigin: true,
          rewrite: (path3) => path3.replace(/^\/abi-chat-proxy/, "/abi-chat"),
          configure: (proxy, options) => {
            proxy.on("proxyReq", (proxyReq, req, res) => {
            });
          }
        }
      },
      warmup: {
        clientFiles: ["./index.html", "./src/{pages,components}/*"]
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiLCAic3JjL3V0aWxzL3NlcnZpY2UudHMiLCAiYnVpbGQvY29uZmlnL3Byb3h5LnRzIiwgImJ1aWxkL2NvbmZpZy90aW1lLnRzIiwgImJ1aWxkL29wdGltaXplL2luZGV4LnRzIiwgImJ1aWxkL3BsdWdpbnMvaW5kZXgudHMiLCAiYnVpbGQvcGx1Z2lucy9hdXRvLWltcG9ydC50cyIsICJidWlsZC9wbHVnaW5zL2h0bWwudHMiLCAiYnVpbGQvcGx1Z2lucy9yb3V0ZXIudHMiLCAiYnVpbGQvcGx1Z2lucy91bm9jc3MudHMiLCAiYnVpbGQvcGx1Z2lucy91bnBsdWdpbi1pY29uLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMva2FuZ3h6L1NvZnR3YXJlL3RydXN0LWFiaS90cnVzdC1hYmktZnJvbnRlbmQvYXBwcy9hYmkvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHByb2Nlc3MgZnJvbSAnbm9kZTpwcm9jZXNzJ1xuaW1wb3J0IHsgVVJMLCBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5cbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnXG5cbmltcG9ydCB7IGNyZWF0ZVZpdGVQcm94eSwgZ2V0QnVpbGRUaW1lIH0gZnJvbSAnLi9idWlsZC9jb25maWcnXG5pbXBvcnQgeyBpbmNsdWRlIH0gZnJvbSAnLi9idWlsZC9vcHRpbWl6ZSdcbmltcG9ydCB7IHNldHVwVml0ZVBsdWdpbnMgfSBmcm9tICcuL2J1aWxkL3BsdWdpbnMnXG5cbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoY29uZmlnRW52ID0+IHtcblxuICBjb25zdCB2aXRlRW52ID0gbG9hZEVudihjb25maWdFbnYubW9kZSwgcHJvY2Vzcy5jd2QoKSkgYXMgdW5rbm93biBhcyBFbnYuSW1wb3J0TWV0YTtcblxuICBjb25zdCBidWlsZFRpbWUgPSBnZXRCdWlsZFRpbWUoKTtcblxuICBjb25zdCBlbmFibGVQcm94eSA9IGNvbmZpZ0Vudi5jb21tYW5kID09PSAnc2VydmUnICYmICFjb25maWdFbnYuaXNQcmV2aWV3O1xuICByZXR1cm4ge1xuICAgIGJhc2U6IHZpdGVFbnYuVklURV9CQVNFX1VSTCxcbiAgICBjc3M6IHtcbiAgICAgIHByZXByb2Nlc3Nvck9wdGlvbnM6IHtcbiAgICAgICAgc2Nzczoge1xuICAgICAgICAgIGFkZGl0aW9uYWxEYXRhOiBgQHVzZSBcIkAvc3R5bGVzL3Njc3MvZ2xvYmFsLnNjc3NcIiBhcyAqO2AsXG4gICAgICAgICAgYXBpOiAnbW9kZXJuLWNvbXBpbGVyJ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSxcbiAgICBkZWZpbmU6IHtcbiAgICAgIEJVSUxEX1RJTUU6IEpTT04uc3RyaW5naWZ5KGJ1aWxkVGltZSlcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczogeyBpbmNsdWRlIH0sXG4gICAgcGx1Z2luczogWy4uLnNldHVwVml0ZVBsdWdpbnModml0ZUVudiwgYnVpbGRUaW1lKV0sXG4gICAgcHJldmlldzoge1xuICAgICAgcG9ydDogOTcyNSxcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuL3NyYycsIGltcG9ydC5tZXRhLnVybCkpLFxuICAgICAgICAnfic6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi4vLi4vJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICB9LFxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBmczoge1xuICAgICAgICBjYWNoZWRDaGVja3M6IGZhbHNlLFxuICAgICAgfSxcbiAgICAgIGhvc3Q6ICcwLjAuMC4wJyxcbiAgICAgIG9wZW46IHRydWUsXG4gICAgICBwb3J0OiA5NTI3LFxuICAgICAgcHJveHk6IHtcbiAgICAgICAgLi4uY3JlYXRlVml0ZVByb3h5KHZpdGVFbnYsIGVuYWJsZVByb3h5KSxcbiAgICAgICAgJy9wcm94eS1hcGknOiB7XG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9wcm94eS1jaGF0LywgJycpLFxuICAgICAgICAgIHRhcmdldDogJ2h0dHA6Ly8xOTIuMTY4LjEuMjUyOjgwODAnLFxuICAgICAgICB9LFxuICAgICAgICAnL2FwaSc6IHtcbiAgICAgICAgICB0YXJnZXQ6ICdodHRwczovLzE5Mi4xNjguMS4yNTIvJyxcbiAgICAgICAgICAvLyB0YXJnZXQ6ICdodHRwOi8vMTIzLjE4MS4xOTIuMTMxOjgxLycsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgLy8gcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FwaS1wcm94eS8sICcvYXBpJyksXG4gICAgICAgICAgY29uZmlndXJlOiAocHJveHksIG9wdGlvbnMpID0+IHtcbiAgICAgICAgICAgIHByb3h5Lm9uKCdwcm94eVJlcScsIChwcm94eVJlcSwgcmVxLCByZXMpID0+IHtcbiAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coJ3Byb3h5UmVxJywgcHJveHlSZXEsIHJlcSwgcmVzKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgICAnL2NoYXQtcHJveHknOiB7XG4gICAgICAgICAgdGFyZ2V0OiAnaHR0cHM6Ly8xOTIuMTY4LjEuMjUyLycsXG4gICAgICAgICAgLy8gdGFyZ2V0OiAnaHR0cDovLzEyMy4xODEuMTkyLjEzMTo4MS8nLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlLFxuICAgICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgcmVzKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwcm94eVJlcScsIHByb3h5UmVxLCByZXEsIHJlcylcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgJy9hYmktY2hhdC1wcm94eSc6IHtcbiAgICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTkyLjE2OC4xLjI1Mi8nLFxuICAgICAgICAgIC8vIHRhcmdldDogJ2h0dHA6Ly8xMjMuMTgxLjE5Mi4xMzE6ODEvJyxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL2FiaS1jaGF0LXByb3h5LywgJy9hYmktY2hhdCcpLFxuICAgICAgICAgIGNvbmZpZ3VyZTogKHByb3h5LCBvcHRpb25zKSA9PiB7XG4gICAgICAgICAgICBwcm94eS5vbigncHJveHlSZXEnLCAocHJveHlSZXEsIHJlcSwgcmVzKSA9PiB7XG4gICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKCdwcm94eVJlcScsIHByb3h5UmVxLCByZXEsIHJlcylcbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICB3YXJtdXA6IHtcbiAgICAgICAgY2xpZW50RmlsZXM6IFsnLi9pbmRleC5odG1sJywgJy4vc3JjL3twYWdlcyxjb21wb25lbnRzfS8qJ10sXG4gICAgICB9LFxuICAgIH0sXG4gIH1cbn0pXG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9zcmMvdXRpbHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9zcmMvdXRpbHMvc2VydmljZS50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMva2FuZ3h6L1NvZnR3YXJlL3RydXN0LWFiaS90cnVzdC1hYmktZnJvbnRlbmQvYXBwcy9hYmkvc3JjL3V0aWxzL3NlcnZpY2UudHNcIjtpbXBvcnQganNvbjUgZnJvbSAnanNvbjUnO1xuXG4vKipcbiAqIENyZWF0ZSBzZXJ2aWNlIGNvbmZpZyBieSBjdXJyZW50IGVudlxuICpcbiAqIEBwYXJhbSBlbnYgVGhlIGN1cnJlbnQgZW52XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVTZXJ2aWNlQ29uZmlnKGVudjogRW52LkltcG9ydE1ldGEpIHtcbiAgY29uc3QgeyBWSVRFX0NIQVRfU0VSVklDRV9CQVNFX1VSTCwgVklURV9PVEhFUl9TRVJWSUNFX0JBU0VfVVJMLCBWSVRFX1NFUlZJQ0VfQVBJX1VSTCwgVklURV9TRVJWSUNFX0JBU0VfVVJMIH0gPSBlbnY7XG5cbiAgbGV0IG90aGVyID0ge30gYXMgUmVjb3JkPEFwcC5TZXJ2aWNlLk90aGVyQmFzZVVSTEtleSwgc3RyaW5nPjtcbiAgdHJ5IHtcbiAgICBvdGhlciA9IGpzb241LnBhcnNlKFZJVEVfT1RIRVJfU0VSVklDRV9CQVNFX1VSTCk7XG4gIH0gY2F0Y2gge1xuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBuby1jb25zb2xlXG4gICAgY29uc29sZS5lcnJvcignVklURV9PVEhFUl9TRVJWSUNFX0JBU0VfVVJMIGlzIG5vdCBhIHZhbGlkIGpzb241IHN0cmluZycpO1xuICB9XG5cbiAgY29uc3QgaHR0cENvbmZpZzogQXBwLlNlcnZpY2UuU2ltcGxlU2VydmljZUNvbmZpZyA9IHtcbiAgICBhcGlVUkw6IFZJVEVfU0VSVklDRV9BUElfVVJMLFxuICAgIGJhc2VVUkw6IFZJVEVfU0VSVklDRV9CQVNFX1VSTCxcbiAgICBjaGF0VVJMOiBWSVRFX0NIQVRfU0VSVklDRV9CQVNFX1VSTCxcbiAgICBvdGhlclxuICB9O1xuXG4gIGNvbnN0IG90aGVySHR0cEtleXMgPSBPYmplY3Qua2V5cyhodHRwQ29uZmlnLm90aGVyKSBhcyBBcHAuU2VydmljZS5PdGhlckJhc2VVUkxLZXlbXTtcblxuICBjb25zdCBvdGhlckNvbmZpZzogQXBwLlNlcnZpY2UuT3RoZXJTZXJ2aWNlQ29uZmlnSXRlbVtdID0gb3RoZXJIdHRwS2V5cy5tYXAoa2V5ID0+IHtcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tY29uc29sZVxuICAgIGNvbnNvbGUubG9nKCdvdGhlckNvbmZpZyBrZXk9Jywga2V5LCAnOyB1cmw9JywgaHR0cENvbmZpZy5vdGhlcltrZXldKTtcbiAgICByZXR1cm4ge1xuICAgICAgYXBpVVJMOiBodHRwQ29uZmlnLmFwaVVSTCxcbiAgICAgIGJhc2VVUkw6IGh0dHBDb25maWcub3RoZXJba2V5XSxcbiAgICAgIGNoYXRVUkw6IGh0dHBDb25maWcuY2hhdFVSTCxcbiAgICAgIGtleSxcbiAgICAgIHByb3h5UGF0dGVybjogY3JlYXRlUHJveHlQYXR0ZXJuKGtleSlcbiAgICB9O1xuICB9KTtcblxuICBjb25zdCBjb25maWc6IEFwcC5TZXJ2aWNlLlNlcnZpY2VDb25maWcgPSB7XG4gICAgYXBpVVJMOiBodHRwQ29uZmlnLmFwaVVSTCxcbiAgICBiYXNlVVJMOiBodHRwQ29uZmlnLmJhc2VVUkwsXG4gICAgY2hhdFVSTDogaHR0cENvbmZpZy5jaGF0VVJMLFxuICAgIG90aGVyOiBvdGhlckNvbmZpZyxcbiAgICBwcm94eVBhdHRlcm46IGNyZWF0ZVByb3h5UGF0dGVybigpXG4gIH07XG5cbiAgcmV0dXJuIGNvbmZpZztcbn1cblxuLyoqXG4gKiBnZXQgYmFja2VuZCBzZXJ2aWNlIGJhc2UgdXJsXG4gKlxuICogQHBhcmFtIGVudiAtIHRoZSBjdXJyZW50IGVudlxuICogQHBhcmFtIGlzUHJveHkgLSBpZiB1c2UgcHJveHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNlcnZpY2VCYXNlVVJMKGVudjogRW52LkltcG9ydE1ldGEsIGlzUHJveHk6IGJvb2xlYW4pIHtcbiAgY29uc3QgeyBhcGlVUkwsIGJhc2VVUkwsIGNoYXRVUkwsIG90aGVyIH0gPSBjcmVhdGVTZXJ2aWNlQ29uZmlnKGVudik7XG4gIC8vIGNvbnNvbGUubG9nKCdnZXRTZXJ2aWNlQmFzZVVSTCBiYXNlVVJMJywgYmFzZVVSTCwgJzsgYXBpVVJMOycsIGFwaVVSTCwgJzsgb3RoZXI9Jywgb3RoZXIpO1xuICBjb25zdCBvdGhlckJhc2VVUkwgPSB7fSBhcyBSZWNvcmQ8QXBwLlNlcnZpY2UuT3RoZXJCYXNlVVJMS2V5LCBzdHJpbmc+O1xuXG4gIG90aGVyLmZvckVhY2goaXRlbSA9PiB7XG4gICAgb3RoZXJCYXNlVVJMW2l0ZW0ua2V5XSA9IGlzUHJveHkgPyBpdGVtLnByb3h5UGF0dGVybiA6IGl0ZW0uYmFzZVVSTDtcbiAgfSk7XG5cbiAgcmV0dXJuIHtcbiAgICBhcGlVUkwsXG4gICAgYmFzZVVSTDogaXNQcm94eSA/IGNyZWF0ZVByb3h5UGF0dGVybigpIDogYmFzZVVSTCxcbiAgICBjaGF0VVJMLFxuICAgIG90aGVyQmFzZVVSTFxuICB9O1xufVxuXG4vKipcbiAqIEdldCBwcm94eSBwYXR0ZXJuIG9mIGJhY2tlbmQgc2VydmljZSBiYXNlIHVybFxuICpcbiAqIEBwYXJhbSBrZXkgSWYgbm90IHNldCwgd2lsbCB1c2UgdGhlIGRlZmF1bHQga2V5XG4gKi9cbmZ1bmN0aW9uIGNyZWF0ZVByb3h5UGF0dGVybihrZXk/OiBBcHAuU2VydmljZS5PdGhlckJhc2VVUkxLZXkpIHtcbiAgaWYgKCFrZXkpIHtcbiAgICByZXR1cm4gJy9wcm94eS1kZWZhdWx0JztcbiAgfVxuXG4gIHJldHVybiBgL3Byb3h5LSR7a2V5fWA7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9jb25maWdcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9jb25maWcvcHJveHkudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpL2J1aWxkL2NvbmZpZy9wcm94eS50c1wiO2ltcG9ydCB0eXBlIHsgUHJveHlPcHRpb25zIH0gZnJvbSAndml0ZSc7XG5cbmltcG9ydCB7IGNyZWF0ZVNlcnZpY2VDb25maWcgfSBmcm9tICcuLi8uLi9zcmMvdXRpbHMvc2VydmljZSc7XG5cbi8qKlxuICogU2V0IGh0dHAgcHJveHlcbiAqXG4gKiBAcGFyYW0gZW52IC0gVGhlIGN1cnJlbnQgZW52XG4gKiBAcGFyYW0gZW5hYmxlIC0gSWYgZW5hYmxlIGh0dHAgcHJveHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZVZpdGVQcm94eShlbnY6IEVudi5JbXBvcnRNZXRhLCBlbmFibGU6IGJvb2xlYW4pIHtcbiAgY29uc3QgaXNFbmFibGVIdHRwUHJveHkgPSBlbmFibGUgJiYgZW52LlZJVEVfSFRUUF9QUk9YWSA9PT0gJ1knO1xuXG4gIGlmICghaXNFbmFibGVIdHRwUHJveHkpIHJldHVybiB1bmRlZmluZWQ7XG5cbiAgY29uc3QgeyBhcGlVUkwsIGJhc2VVUkwsIG90aGVyLCBwcm94eVBhdHRlcm4gfSA9IGNyZWF0ZVNlcnZpY2VDb25maWcoZW52KTtcblxuICBjb25zdCBwcm94eTogUmVjb3JkPHN0cmluZywgUHJveHlPcHRpb25zPiA9IGNyZWF0ZVByb3h5SXRlbSh7IGFwaVVSTCwgYmFzZVVSTCwgcHJveHlQYXR0ZXJuIH0pO1xuXG4gIG90aGVyLmZvckVhY2goaXRlbSA9PiB7XG4gICAgT2JqZWN0LmFzc2lnbihwcm94eSwgY3JlYXRlUHJveHlJdGVtKGl0ZW0pKTtcbiAgfSk7XG5cbiAgcmV0dXJuIHByb3h5O1xufVxuXG5mdW5jdGlvbiBjcmVhdGVQcm94eUl0ZW0oaXRlbTogQXBwLlNlcnZpY2UuU2VydmljZUNvbmZpZ0l0ZW0pIHtcbiAgY29uc3QgcHJveHk6IFJlY29yZDxzdHJpbmcsIFByb3h5T3B0aW9ucz4gPSB7fTtcblxuICBwcm94eVtpdGVtLnByb3h5UGF0dGVybl0gPSB7XG4gICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgIHJld3JpdGU6IHBhdGggPT4gcGF0aC5yZXBsYWNlKG5ldyBSZWdFeHAoYF4ke2l0ZW0ucHJveHlQYXR0ZXJufWApLCAnJyksXG4gICAgdGFyZ2V0OiBpdGVtLmJhc2VVUkxcbiAgfTtcblxuICByZXR1cm4gcHJveHk7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9jb25maWdcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9jb25maWcvdGltZS50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMva2FuZ3h6L1NvZnR3YXJlL3RydXN0LWFiaS90cnVzdC1hYmktZnJvbnRlbmQvYXBwcy9hYmkvYnVpbGQvY29uZmlnL3RpbWUudHNcIjtpbXBvcnQgZGF5anMgZnJvbSAnZGF5anMnO1xuaW1wb3J0IHRpbWV6b25lIGZyb20gJ2RheWpzL3BsdWdpbi90aW1lem9uZSc7XG5pbXBvcnQgdXRjIGZyb20gJ2RheWpzL3BsdWdpbi91dGMnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0QnVpbGRUaW1lKCkge1xuICBkYXlqcy5leHRlbmQodXRjKTtcbiAgZGF5anMuZXh0ZW5kKHRpbWV6b25lKTtcblxuICBjb25zdCBidWlsZFRpbWUgPSBkYXlqcy50eihEYXRlLm5vdygpLCAnQXNpYS9TaGFuZ2hhaScpLmZvcm1hdCgnWVlZWS1NTS1ERCBISDptbTpzcycpO1xuXG4gIHJldHVybiBidWlsZFRpbWU7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9vcHRpbWl6ZVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpL2J1aWxkL29wdGltaXplL2luZGV4LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9vcHRpbWl6ZS9pbmRleC50c1wiO2NvbnN0IGluY2x1ZGUgPSBbJ2Fob29rcycsICdlY2hhcnRzJywgJ2kxOG5leHQnLCAnbG9kYXNoJywgJ2ltbWVyJywgJ3JlYWN0LWkxOG5leHQnXTtcblxuZXhwb3J0IHsgaW5jbHVkZSB9O1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMva2FuZ3h6L1NvZnR3YXJlL3RydXN0LWFiaS90cnVzdC1hYmktZnJvbnRlbmQvYXBwcy9hYmkvYnVpbGQvcGx1Z2luc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpL2J1aWxkL3BsdWdpbnMvaW5kZXgudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpL2J1aWxkL3BsdWdpbnMvaW5kZXgudHNcIjtpbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnO1xuaW1wb3J0IHR5cGUgeyBQbHVnaW5PcHRpb24gfSBmcm9tICd2aXRlJztcbmltcG9ydCBJbnNwZWN0IGZyb20gJ3ZpdGUtcGx1Z2luLWluc3BlY3QnO1xuaW1wb3J0IHJlbW92ZUNvbnNvbGUgZnJvbSAndml0ZS1wbHVnaW4tcmVtb3ZlLWNvbnNvbGUnO1xuXG5pbXBvcnQgeyBzZXR1cEF1dG9JbXBvcnQgfSBmcm9tICcuL2F1dG8taW1wb3J0JztcbmltcG9ydCB7IHNldHVwSHRtbFBsdWdpbiB9IGZyb20gJy4vaHRtbCc7XG5pbXBvcnQgeyBzZXR1cEVsZWdhbnRSb3V0ZXIgfSBmcm9tICcuL3JvdXRlcic7XG5pbXBvcnQgeyBzZXR1cFVub2NzcyB9IGZyb20gJy4vdW5vY3NzJztcbmltcG9ydCB7IHNldHVwVW5QbHVnaW5JY29uIH0gZnJvbSAnLi91bnBsdWdpbi1pY29uJztcblxuZXhwb3J0IGZ1bmN0aW9uIHNldHVwVml0ZVBsdWdpbnModml0ZUVudjogRW52LkltcG9ydE1ldGEsIGJ1aWxkVGltZTogc3RyaW5nKSB7XG4gIGNvbnN0IHBsdWdpbnM6IFBsdWdpbk9wdGlvbiA9IFtcbiAgICByZWFjdCgpLFxuICAgIHNldHVwQXV0b0ltcG9ydCh2aXRlRW52KSxcbiAgICBzZXR1cFVub2Nzcyh2aXRlRW52KSxcbiAgICAuLi5zZXR1cFVuUGx1Z2luSWNvbih2aXRlRW52KSxcbiAgICBzZXR1cEVsZWdhbnRSb3V0ZXIoKSxcbiAgICBJbnNwZWN0KCksXG4gICAgcmVtb3ZlQ29uc29sZSgpLFxuICAgIHNldHVwSHRtbFBsdWdpbihidWlsZFRpbWUpLFxuICBdO1xuICByZXR1cm4gcGx1Z2lucztcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpL2J1aWxkL3BsdWdpbnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9wbHVnaW5zL2F1dG8taW1wb3J0LnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9wbHVnaW5zL2F1dG8taW1wb3J0LnRzXCI7aW1wb3J0IEF1dG9JbXBvcnQgZnJvbSAndW5wbHVnaW4tYXV0by1pbXBvcnQvdml0ZSc7XG5pbXBvcnQgSWNvbnNSZXNvbHZlciBmcm9tICd1bnBsdWdpbi1pY29ucy9yZXNvbHZlcic7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEF1dG9JbXBvcnQodml0ZUVudjogRW52LkltcG9ydE1ldGEpIHtcbiAgY29uc3QgeyBWSVRFX0lDT05fTE9DQUxfUFJFRklYLCBWSVRFX0lDT05fUFJFRklYIH0gPSB2aXRlRW52O1xuICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IFZJVEVfSUNPTl9MT0NBTF9QUkVGSVgucmVwbGFjZShgJHtWSVRFX0lDT05fUFJFRklYfS1gLCAnJyk7XG4gIHJldHVybiBBdXRvSW1wb3J0KHtcbiAgICBkaXJzOiBbJ3NyYy9ob29rcy8qKicsICdzcmMvY29tcG9uZW50cy8qKiddLFxuICAgIGR0czogJ3NyYy90eXBlcy9hdXRvLWltcG9ydHMuZC50cycsXG4gICAgaW1wb3J0czogWydyZWFjdCcsICdyZWFjdC1yb3V0ZXItZG9tJywgJ3JlYWN0LWkxOG5leHQnLCAnYWhvb2tzJywgeyBmcm9tOiAncmVhY3QnLCBpbXBvcnRzOiBbJ0ZDJ10sIHR5cGU6IHRydWUgfV0sXG4gICAgaW5jbHVkZTogWy9cXC5bdGpdc3g/JC9dLFxuICAgIHJlc29sdmVyczogW1xuICAgICAgSWNvbnNSZXNvbHZlcih7XG4gICAgICAgIGNvbXBvbmVudFByZWZpeDogVklURV9JQ09OX1BSRUZJWCxcbiAgICAgICAgY3VzdG9tQ29sbGVjdGlvbnM6IFtjb2xsZWN0aW9uTmFtZV0sXG4gICAgICAgIGV4dGVuc2lvbjogJ3RzeCcsXG4gICAgICAgIHByZWZpeDogVklURV9JQ09OX1BSRUZJWFxuICAgICAgfSksXG4gICAgICBhdXRvSW1wb3J0QW50ZFxuICAgIF1cbiAgfSk7XG59XG5cbmZ1bmN0aW9uIGF1dG9JbXBvcnRBbnRkKGNvbXBvbmVudE5hbWU6IHN0cmluZykge1xuICBjb25zdCBwYXR0ZXJuID0gL15BW0EtWl0vO1xuICBpZiAocGF0dGVybi50ZXN0KGNvbXBvbmVudE5hbWUpKSB7XG4gICAgcmV0dXJuIHsgZnJvbTogJ2FudGQnLCBuYW1lOiBjb21wb25lbnROYW1lLnNsaWNlKDEpIH07XG4gIH1cbiAgcmV0dXJuIG51bGw7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9wbHVnaW5zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMva2FuZ3h6L1NvZnR3YXJlL3RydXN0LWFiaS90cnVzdC1hYmktZnJvbnRlbmQvYXBwcy9hYmkvYnVpbGQvcGx1Z2lucy9odG1sLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9wbHVnaW5zL2h0bWwudHNcIjtpbXBvcnQgdHlwZSB7IFBsdWdpbiB9IGZyb20gJ3ZpdGUnO1xuXG5leHBvcnQgZnVuY3Rpb24gc2V0dXBIdG1sUGx1Z2luKGJ1aWxkVGltZTogc3RyaW5nKSB7XG4gIGNvbnN0IHBsdWdpbjogUGx1Z2luID0ge1xuICAgIGFwcGx5OiAnYnVpbGQnLFxuICAgIG5hbWU6ICdodG1sLXBsdWdpbicsXG4gICAgdHJhbnNmb3JtSW5kZXhIdG1sKGh0bWwpIHtcbiAgICAgIHJldHVybiBodG1sLnJlcGxhY2UoJzxoZWFkPicsIGA8aGVhZD5cXG4gICAgPG1ldGEgbmFtZT1cImJ1aWxkVGltZVwiIGNvbnRlbnQ9XCIke2J1aWxkVGltZX1cIj5gKTtcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIHBsdWdpbjtcbn1cbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpL2J1aWxkL3BsdWdpbnNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9wbHVnaW5zL3JvdXRlci50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMva2FuZ3h6L1NvZnR3YXJlL3RydXN0LWFiaS90cnVzdC1hYmktZnJvbnRlbmQvYXBwcy9hYmkvYnVpbGQvcGx1Z2lucy9yb3V0ZXIudHNcIjtpbXBvcnQgdHlwZSB7IFJvdXRlS2V5IH0gZnJvbSAnQGVsZWdhbnQtcm91dGVyL3R5cGVzJztcbmltcG9ydCBFbGVnYW50UmVhY3RSb3V0ZXIgZnJvbSAnQG9oaC04ODkvcmVhY3QtYXV0by1yb3V0ZS92aXRlJztcblxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1lbXB0eS1vYmplY3QtdHlwZVxuaW50ZXJmYWNlIFJvdXRlTWV0YSBleHRlbmRzIFJlY29yZDxzdHJpbmcgfCBudW1iZXIsIHVua25vd24+IHt9XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cEVsZWdhbnRSb3V0ZXIoKSB7XG4gIHJldHVybiBFbGVnYW50UmVhY3RSb3V0ZXIoe1xuICAgIGN1c3RvbVJvdXRlczoge1xuICAgICAgbmFtZXM6IFtcbiAgICAgICAgJ2V4Y2VwdGlvbl80MDMnLFxuICAgICAgICAnZXhjZXB0aW9uXzQwNCcsXG4gICAgICAgICdleGNlcHRpb25fNTAwJyxcbiAgICAgICAgLy8gJ2RvY3VtZW50X3Byb2plY3QnLFxuICAgICAgICAvLyAnZG9jdW1lbnRfcHJvamVjdC1saW5rJyxcbiAgICAgICAgLy8gJ2RvY3VtZW50X3JlYWN0JyxcbiAgICAgICAgLy8gJ2RvY3VtZW50X3ZpdGUnLFxuICAgICAgICAvLyAnZG9jdW1lbnRfdW5vY3NzJyxcbiAgICAgICAgLy8gJ2RvY3VtZW50X3Byb0NvbXBvbmVudHMnLFxuICAgICAgICAvLyAnZG9jdW1lbnRfYW50ZCcsXG4gICAgICAgICdsb2dvdXQnXG4gICAgICBdXG4gICAgfSxcbiAgICBsYXlvdXRzOiB7XG4gICAgICBiYXNlOiAnc3JjL2xheW91dHMvYmFzZS1sYXlvdXQvaW5kZXgudHN4JyxcbiAgICAgIGJsYW5rOiAnc3JjL2xheW91dHMvYmxhbmstbGF5b3V0L2luZGV4LnRzeCdcbiAgICB9LFxuICAgIGxvZzogZmFsc2UsXG4gICAgb25Sb3V0ZU1ldGFHZW4ocm91dGVOYW1lKSB7XG4gICAgICBjb25zdCBrZXkgPSByb3V0ZU5hbWUgYXMgUm91dGVLZXk7XG5cbiAgICAgIGNvbnN0IGNvbnN0YW50Um91dGVzOiBSb3V0ZUtleVtdID0gWydsb2dpbicsICc0MDMnLCAnNDA0JywgJzUwMCddO1xuXG4gICAgICBjb25zdCBtZXRhOiBQYXJ0aWFsPFJvdXRlTWV0YT4gPSB7XG4gICAgICAgIGkxOG5LZXk6IGByb3V0ZS4ke2tleX1gIGFzIEFwcC5JMThuLkkxOG5LZXksXG4gICAgICAgIHRpdGxlOiBrZXlcbiAgICAgIH07XG5cbiAgICAgIGlmIChjb25zdGFudFJvdXRlcy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICAgIG1ldGEuY29uc3RhbnQgPSB0cnVlO1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gbWV0YTtcbiAgICB9XG4gIH0pO1xufVxuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMva2FuZ3h6L1NvZnR3YXJlL3RydXN0LWFiaS90cnVzdC1hYmktZnJvbnRlbmQvYXBwcy9hYmkvYnVpbGQvcGx1Z2luc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2thbmd4ei9Tb2Z0d2FyZS90cnVzdC1hYmkvdHJ1c3QtYWJpLWZyb250ZW5kL2FwcHMvYWJpL2J1aWxkL3BsdWdpbnMvdW5vY3NzLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9wbHVnaW5zL3Vub2Nzcy50c1wiO2ltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCc7XG5pbXBvcnQgcHJvY2VzcyBmcm9tICdub2RlOnByb2Nlc3MnO1xuXG5pbXBvcnQgeyBGaWxlU3lzdGVtSWNvbkxvYWRlciB9IGZyb20gJ0BpY29uaWZ5L3V0aWxzL2xpYi9sb2FkZXIvbm9kZS1sb2FkZXJzJztcbmltcG9ydCBwcmVzZXRJY29ucyBmcm9tICdAdW5vY3NzL3ByZXNldC1pY29ucyc7XG5pbXBvcnQgdW5vY3NzIGZyb20gJ0B1bm9jc3Mvdml0ZSc7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFVub2Nzcyh2aXRlRW52OiBFbnYuSW1wb3J0TWV0YSkge1xuICBjb25zdCB7IFZJVEVfSUNPTl9MT0NBTF9QUkVGSVgsIFZJVEVfSUNPTl9QUkVGSVggfSA9IHZpdGVFbnY7XG5cbiAgY29uc3QgbG9jYWxJY29uUGF0aCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnc3JjL2Fzc2V0cy9zdmctaWNvbicpO1xuXG4gIC8qKiBUaGUgbmFtZSBvZiB0aGUgbG9jYWwgaWNvbiBjb2xsZWN0aW9uICovXG4gIGNvbnN0IGNvbGxlY3Rpb25OYW1lID0gVklURV9JQ09OX0xPQ0FMX1BSRUZJWC5yZXBsYWNlKGAke1ZJVEVfSUNPTl9QUkVGSVh9LWAsICcnKTtcblxuICByZXR1cm4gdW5vY3NzKHtcbiAgICB0aGVtZTp7XG4gICAgICBicmVha3BvaW50czoge1xuICAgICAgICBzbTogJzY0MHB4JyxcbiAgICAgICAgbWQ6ICc3NjhweCcsXG4gICAgICAgIGxnOiAnMTAyNHB4JyxcbiAgICAgICAgeGw6ICcxMjgwcHgnLFxuICAgICAgICAnMnhsJzogJzE1MzZweCcsXG4gICAgICB9XG4gICAgfSxcbiAgICBwcmVzZXRzOiBbXG4gICAgICBwcmVzZXRJY29ucyh7XG4gICAgICAgIGNvbGxlY3Rpb25zOiB7XG4gICAgICAgICAgW2NvbGxlY3Rpb25OYW1lXTogRmlsZVN5c3RlbUljb25Mb2FkZXIobG9jYWxJY29uUGF0aCwgc3ZnID0+XG4gICAgICAgICAgICBzdmcucmVwbGFjZSgvXjxzdmdcXHMvLCAnPHN2ZyB3aWR0aD1cIjFlbVwiIGhlaWdodD1cIjFlbVwiICcpXG4gICAgICAgICAgKVxuICAgICAgICB9LFxuICAgICAgICBleHRyYVByb3BlcnRpZXM6IHtcbiAgICAgICAgICBkaXNwbGF5OiAnaW5saW5lLWJsb2NrJ1xuICAgICAgICB9LFxuICAgICAgICBwcmVmaXg6IGAke1ZJVEVfSUNPTl9QUkVGSVh9LWAsXG4gICAgICAgIHNjYWxlOiAxLFxuICAgICAgICB3YXJuOiB0cnVlXG4gICAgICB9KVxuICAgIF1cbiAgfSk7XG59XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9wbHVnaW5zXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMva2FuZ3h6L1NvZnR3YXJlL3RydXN0LWFiaS90cnVzdC1hYmktZnJvbnRlbmQvYXBwcy9hYmkvYnVpbGQvcGx1Z2lucy91bnBsdWdpbi1pY29uLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9rYW5neHovU29mdHdhcmUvdHJ1c3QtYWJpL3RydXN0LWFiaS1mcm9udGVuZC9hcHBzL2FiaS9idWlsZC9wbHVnaW5zL3VucGx1Z2luLWljb24udHNcIjtpbXBvcnQgcGF0aCBmcm9tICdub2RlOnBhdGgnO1xuaW1wb3J0IHByb2Nlc3MgZnJvbSAnbm9kZTpwcm9jZXNzJztcblxuaW1wb3J0IHsgRmlsZVN5c3RlbUljb25Mb2FkZXIgfSBmcm9tICd1bnBsdWdpbi1pY29ucy9sb2FkZXJzJztcbmltcG9ydCBJY29ucyBmcm9tICd1bnBsdWdpbi1pY29ucy92aXRlJztcbmltcG9ydCB0eXBlIHsgUGx1Z2luT3B0aW9uIH0gZnJvbSAndml0ZSc7XG5pbXBvcnQgeyBjcmVhdGVTdmdJY29uc1BsdWdpbiB9IGZyb20gJ3ZpdGUtcGx1Z2luLXN2Zy1pY29ucyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXR1cFVuUGx1Z2luSWNvbih2aXRlRW52OiBFbnYuSW1wb3J0TWV0YSkge1xuICBjb25zdCB7IFZJVEVfSUNPTl9MT0NBTF9QUkVGSVgsIFZJVEVfSUNPTl9QUkVGSVggfSA9IHZpdGVFbnY7XG4gIFxuICBjb25zdCBsb2NhbEljb25QYXRoID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICdzcmMvYXNzZXRzL3N2Zy1pY29uJyk7XG4gIFxuICAvKiogVGhlIG5hbWUgb2YgdGhlIGxvY2FsIGljb24gY29sbGVjdGlvbiAqL1xuICBjb25zdCBjb2xsZWN0aW9uTmFtZSA9IFZJVEVfSUNPTl9MT0NBTF9QUkVGSVgucmVwbGFjZShgJHtWSVRFX0lDT05fUFJFRklYfS1gLCAnJyk7XG4gIFxuICBjb25zdCBwbHVnaW5zOiBQbHVnaW5PcHRpb25bXSA9IFtcbiAgICBjcmVhdGVTdmdJY29uc1BsdWdpbih7XG4gICAgICAvLyBjdXN0b21Eb21JZDogJ19fU1ZHX0lDT05fTE9DQUxfXycsXG4gICAgICBpY29uRGlyczogW2xvY2FsSWNvblBhdGhdLFxuICAgICAgaW5qZWN0OiAnYm9keS1sYXN0JyxcbiAgICAgIHN5bWJvbElkOiBgJHtWSVRFX0lDT05fTE9DQUxfUFJFRklYfS1bZGlyXS1bbmFtZV1gXG4gICAgfSksXG4gICAgSWNvbnMoe1xuICAgICAgY29tcGlsZXI6ICdqc3gnLFxuICAgICAgY3VzdG9tQ29sbGVjdGlvbnM6IHtcbiAgICAgICAgW2NvbGxlY3Rpb25OYW1lXTogRmlsZVN5c3RlbUljb25Mb2FkZXIobG9jYWxJY29uUGF0aCwgc3ZnID0+XG4gICAgICAgICAgc3ZnLnJlcGxhY2UoL148c3ZnXFxzLywgJzxzdmcgd2lkdGg9XCIxZW1cIiBoZWlnaHQ9XCIxZW1cIiAnKVxuICAgICAgICApXG4gICAgICB9LFxuICAgICAgZGVmYXVsdENsYXNzOiAnaW5saW5lLWJsb2NrJyxcbiAgICAgIGpzeDogJ3JlYWN0JyxcbiAgICAgIHNjYWxlOiAxXG4gICAgfSlcbiAgXTtcblxuICByZXR1cm4gcGx1Z2lucztcbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBc1csT0FBT0EsY0FBYTtBQUMxWCxTQUFTLEtBQUsscUJBQXFCO0FBRW5DLFNBQVMsY0FBYyxlQUFlOzs7QUNIc1YsT0FBTyxXQUFXO0FBT3ZZLFNBQVMsb0JBQW9CLEtBQXFCO0FBQ3ZELFFBQU0sRUFBRSw0QkFBNEIsNkJBQTZCLHNCQUFzQixzQkFBc0IsSUFBSTtBQUVqSCxNQUFJLFFBQVEsQ0FBQztBQUNiLE1BQUk7QUFDRixZQUFRLE1BQU0sTUFBTSwyQkFBMkI7QUFBQSxFQUNqRCxRQUFRO0FBRU4sWUFBUSxNQUFNLHlEQUF5RDtBQUFBLEVBQ3pFO0FBRUEsUUFBTSxhQUE4QztBQUFBLElBQ2xELFFBQVE7QUFBQSxJQUNSLFNBQVM7QUFBQSxJQUNULFNBQVM7QUFBQSxJQUNUO0FBQUEsRUFDRjtBQUVBLFFBQU0sZ0JBQWdCLE9BQU8sS0FBSyxXQUFXLEtBQUs7QUFFbEQsUUFBTSxjQUFvRCxjQUFjLElBQUksU0FBTztBQUVqRixZQUFRLElBQUksb0JBQW9CLEtBQUssVUFBVSxXQUFXLE1BQU0sR0FBRyxDQUFDO0FBQ3BFLFdBQU87QUFBQSxNQUNMLFFBQVEsV0FBVztBQUFBLE1BQ25CLFNBQVMsV0FBVyxNQUFNLEdBQUc7QUFBQSxNQUM3QixTQUFTLFdBQVc7QUFBQSxNQUNwQjtBQUFBLE1BQ0EsY0FBYyxtQkFBbUIsR0FBRztBQUFBLElBQ3RDO0FBQUEsRUFDRixDQUFDO0FBRUQsUUFBTSxTQUFvQztBQUFBLElBQ3hDLFFBQVEs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
