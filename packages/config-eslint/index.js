/**
 * ESLint 配置文件
 * @type {import("eslint").Linter.Config}
 */

module.exports = {
  // TypeScript 的 ESLint 解析器，负责将 TypeScript 代码转换为 ESTree 兼容的形式
  parser: '@typescript-eslint/parser',

  // 启用的 ESLint 插件列表
  plugins: [
    '@typescript-eslint', // TypeScript 语法支持
    'testing-library', // Testing Library 最佳实践
    '@tanstack/query', // React Query/TanStack Query 规则
    'jest-dom', // Jest DOM 测试工具规则
    'jest', // Jest 测试框架规则
    'import', // import/export 语句检查
    'react-refresh', // React Fast Refresh 支持
  ],

  // 继承的 ESLint 配置集合
  extends: [
    'plugin:@typescript-eslint/strict-type-checked', // 严格的 TypeScript 类型检查规则
    'plugin:@typescript-eslint/stylistic-type-checked', // TypeScript 代码风格规则
    'prettier', // 禁用所有与 Prettier 冲突的规则
    'plugin:prettier/recommended', // 启用 prettier 插件和推荐配置
    'plugin:jsx-a11y/recommended', // React 可访问性检查规则
    'plugin:react/recommended', // React 推荐规则集
    'plugin:react-hooks/recommended', // React Hooks 推荐规则
    'plugin:@tanstack/eslint-plugin-query/recommended', // TanStack Query 最佳实践
    'plugin:no-array-reduce/recommended', // 避免使用 Array.reduce
    'plugin:testing-library/react', // React Testing Library 最佳实践
    'plugin:jest-dom/recommended', // Jest-dom 测试工具推荐规则
  ],

  rules: {
    'react-refresh/only-export-components': ['warn', { allowConstantExport: true }], // React Refresh：只导出组件以支持 HMR
    'react/react-in-jsx-scope': 'off', // React 17+ 不需要显式导入 React
    'react/prop-types': 'off', // TypeScript 项目通常无需 prop-types 校验

    'prefer-template': 'error', // 优先使用模板字符串而不是字符串拼接
    'no-nested-ternary': 'error', // 禁止嵌套三元表达式（可读性）
    'no-unneeded-ternary': 'error', // 禁止不必要的三元表达式
    'spaced-comment': 'error', // 注释前要求空格，例如 // comment
    'id-length': ['error', { min: 2, properties: 'never' }], // 变量名最短长度为 2

    '@typescript-eslint/ban-ts-comment': ['error', { 'ts-expect-error': 'allow-with-description' }], // 限制 ts-ignore/ts-expect-error 的使用，要求带描述
    '@typescript-eslint/consistent-type-definitions': ['error', 'type'], // 强制使用 type 而不是 interface
    '@typescript-eslint/array-type': ['error', { default: 'generic' }], // 强制使用 Array<T> 而非 T[]
    '@typescript-eslint/ban-types': 'error', // 禁用一些不安全/不推荐的类型
    '@typescript-eslint/prefer-nullish-coalescing': 'error', // 优先使用 ?? 而不是 || 判断 null/undefined
    '@typescript-eslint/no-unnecessary-condition': 'error', // 防止不必要的条件判断（显式可知总是 true/false）
    '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }], // 防止 void 表达式导致混淆

    'jsx-a11y/anchor-is-valid': ['off'], // 关闭对 <a> 有效性检查（项目特定需要时可开启）

    'jest/valid-title': [
      // Jest：强制测试标题格式
      'error',
      {
        mustMatch: {
          it: [/should.*when/u.source, "Test title must include 'should' and 'when'"],
        },
      },
    ],

    // 'import/no-default-export': 'error', // 禁止默认导出，使用命名导出以便重构与 tree-shaking
    'import/order': [
      // import 分组与排序规则
      'error',
      {
        groups: ['builtin', 'external', 'internal', 'parent', 'sibling'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],
  },

  /**
   * 特定文件的规则覆盖配置
   * 用于对不同类型的文件应用不同的规则
   */
  overrides: [
    {
      // 环境变量类型声明文件
      files: ['ProcessEnv.d.ts'],
      rules: {
        // 允许在环境声明文件中使用 interface（常见做法）
        '@typescript-eslint/consistent-type-definitions': 'off',
      },
    },
    {
      // 页面组件文件（通常需要默认导出以配合路由约定）
      files: ['src/pages/**/*'],
      rules: {
        // 允许页面组件使用默认导出（符合 Next.js 等框架约定）
        'import/no-default-export': 'off',
      },
    },
  ],

  /**
   * ESLint 文件忽略配置
   * 默认会忽略以 "." 开头的文件/文件夹，使用 !.* 来覆盖此行为
   * @see https://github.com/eslint/eslint/issues/10341
   */
  ignorePatterns: [
    '!.*', // 覆盖默认行为，检查点文件
    'node_modules', // 第三方依赖目录
    '.next', // Next.js 构建输出
    '.turbo', // Turborepo 缓存目录
    'dist', // 包构建输出目录
    'compiled', // TypeScript 编译输出
    'build', // 通用构建输出目录
    'build-storybook', // Storybook 静态构建输出
    // 以下文件未被 git 忽略。ESLint 修复中：https://github.com/eslint/eslint/issues/15010
    'VersionInfo.ts', // 自动生成的版本信息
    'next-env.d.ts', // Next.js 自动生成的类型声明
  ],

  /**
   * ESLint 运行时配置
   * 包含 TypeScript、导入解析和 React 相关设置
   */
  settings: {
    // TypeScript 配置
    typescript: {},

    // import 语句解析器配置
    'import/resolver': {
      typescript: {
        // 指定所有可能的 tsconfig 位置，支持 monorepo
        project: [
          './tsconfig.json', // 根项目配置
          'apps/*/tsconfig.json', // 所有应用配置
          'packages/*/tsconfig.json', // 所有包配置
        ],
      },
    },

    // React 配置
    react: {
      version: 'detect', // 自动检测项目中的 React 版本
    },
  },
}
