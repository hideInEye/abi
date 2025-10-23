# 前端项目脚手架（Vite + React + pnpm + Monorepo + 微前端可扩展 + TS + 测试规范 + TailwindCSS）

# 📦 仓库结构

structure: |
.
├─ apps/
│ ├─ portal/ # 前台门户应用
│ ├─ admin/ # 后台管理应用
│ └─ data-screen/ # BI 大屏应用（如需）
├─ packages/
│ ├─ utils/ # 公共工具库
│ ├─ ui/ # 公共UI组件库
│ ├─ charts/ # 图表封装库
│ └─ config/ # 配置、常量
├─ .eslintrc.cjs # ESLint 配置
├─ .prettierrc # Prettier 配置
├─ commitlint.config.cjs# Commit 规范
├─ tailwind.config.cjs # Tailwind 全局配置
├─ postcss.config.cjs # PostCSS 配置
├─ vitest.config.ts # Vitest 测试配置
├─ tsconfig.json # TS 全局配置
├─ tsconfig.base.json # TS 基础规范配置
├─ package.json # 根依赖及 workspace 配置
└─ pnpm-workspace.yaml # pnpm 工作区配置

pnpm-workspace.yaml: |
packages: - "apps/_" - "packages/_"

package.json: |
{
"name": "my-org",
"private": true,
"version": "0.0.0",
"packageManager": "pnpm@8",
"scripts": {
"dev:portal": "pnpm --filter portal dev",
"dev:admin": "pnpm --filter admin dev",
"build": "pnpm -r build",
"lint": "eslint . --ext .js,.jsx,.ts,.tsx",
"format": "prettier --write .",
"test": "vitest run --coverage",
"test:ui": "vitest --ui",
"type-check": "tsc --noEmit",
"commit": "cz"
},
"devDependencies": {
"eslint": "^8.0.0",
"eslint-config-prettier": "^9.0.0",
"eslint-plugin-import": "^2.29.0",
"eslint-plugin-react": "^7.33.0",
"eslint-plugin-react-hooks": "^4.6.0",
"@typescript-eslint/eslint-plugin": "^6.0.0",
"@typescript-eslint/parser": "^6.0.0",
"prettier": "^3.0.0",
"typescript": "^5.0.0",
"@commitlint/cli": "^18.0.0",
"@commitlint/config-conventional": "^18.0.0",
"commitizen": "^4.3.0",
"cz-conventional-changelog": "^3.3.0",
"vitest": "^1.0.0",
"@testing-library/react": "^14.0.0",
"@testing-library/jest-dom": "^6.0.0",
"@testing-library/user-event": "^14.0.0",
"tailwindcss": "^3.3.0",
"postcss": "^8.4.0",
"autoprefixer": "^10.4.0"
}
}

apps/portal/vite.config.ts: |
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
plugins: [react()],
resolve: {
alias: {
'@utils': path.resolve(**dirname, '../../packages/utils/src'),
'@ui': path.resolve(**dirname, '../../packages/ui/src'),
'@charts': path.resolve(**dirname, '../../packages/charts/src'),
'@config': path.resolve(**dirname, '../../packages/config/src')
}
},
css: {
postcss: './postcss.config.cjs'
},
test: {
globals: true,
environment: 'jsdom',
setupFiles: ['./src/setupTests.ts']
}
})

.eslintrc.cjs: |
module.exports = {
root: true,
parser: '@typescript-eslint/parser',
parserOptions: {
ecmaVersion: 'latest',
sourceType: 'module',
project: ['./tsconfig.json']
},
env: {
browser: true,
es2021: true,
node: true
},
extends: [
'eslint:recommended',
'plugin:@typescript-eslint/recommended',
'plugin:react/recommended',
'plugin:react-hooks/recommended',
'plugin:import/recommended',
'plugin:import/typescript',
'prettier'
],
settings: {
react: { version: 'detect' }
},
rules: {
'react/react-in-jsx-scope': 'off',
'import/order': [
'error',
{
groups: [['builtin', 'external'], ['internal']],
alphabetize: { order: 'asc', caseInsensitive: true }
}
],
'@typescript-eslint/explicit-function-return-type': 'warn',
'@typescript-eslint/no-unused-vars': ['warn', { "argsIgnorePattern": "^_" }]
}
}

commitlint.config.cjs: |
module.exports = { extends: ['@commitlint/config-conventional'] }

.prettierrc: |
{
"singleQuote": true,
"semi": false,
"trailingComma": "all",
"printWidth": 100,
"arrowParens": "avoid"
}

tsconfig.base.json: |
{
"compilerOptions": {
"target": "ES2020",
"module": "ESNext",
"moduleResolution": "Node",
"baseUrl": ".",
"paths": {
"@utils/_": ["packages/utils/src/_"],
"@ui/_": ["packages/ui/src/_"],
"@charts/_": ["packages/charts/src/_"],
"@config/_": ["packages/config/src/_"]
},
"strict": true,
"forceConsistentCasingInFileNames": true,
"esModuleInterop": true,
"jsx": "react-jsx",
"skipLibCheck": true,
"noImplicitAny": true,
"noUnusedLocals": true,
"noUnusedParameters": true
}
}

tsconfig.json: |
{
"extends": "./tsconfig.base.json",
"include": ["apps", "packages"]
}

vitest.config.ts: |
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
plugins: [react()],
resolve: {
alias: {
'@utils': path.resolve(**dirname, './packages/utils/src'),
'@ui': path.resolve(**dirname, './packages/ui/src')
}
},
test: {
globals: true,
environment: 'jsdom',
setupFiles: ['./setupTests.ts'],
coverage: {
reporter: ['text', 'json', 'html'],
lines: 80,
functions: 80,
branches: 70
}
}
})

setupTests.ts: |
import '@testing-library/jest-dom'

tailwind.config.cjs: |
/**@type {import('tailwindcss').Config} \*/
module.exports = {
content: [
"./apps/**/_.{js,ts,jsx,tsx}",
"./packages/\*\*/_.{js,ts,jsx,tsx}"
],
theme: {
extend: {}
},
plugins: []
}

postcss.config.cjs: |
module.exports = {
plugins: {
tailwindcss: {},
autoprefixer: {}
}
}

usage: |

- 用 `pnpm install` 安装依赖。
- 在任意子应用中 `import { xx } from '@utils'`。
- 通过 `pnpm -r build` 批量构建，`pnpm --filter portal dev` 单独启动某个子项目。
- `pnpm lint` 检查代码规范，`pnpm format` 自动格式化。
- `pnpm type-check` 做 TypeScript 类型检查。
- `pnpm test` 执行单元与组件测试并生成覆盖率报告。
- Tailwind 已全局集成，直接在组件中使用类名如 `className="flex items-center"`.
- 提交信息强制遵循 Conventional Commits 格式（feat/fix/chore...）。

tip: |
已集成 Tailwind CSS + PostCSS + Autoprefixer，全局支持原子化样式。
TypeScript 配置开启严格模式，提供单独 type-check 脚本。
Vitest + Testing Library 支持 React 组件测试和覆盖率检查。
