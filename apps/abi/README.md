
## 简介

[`Trust ABI`](http://192.168.1.251/login) 是一个清新优雅、高颜值且功能强大的智能对话式分析平台，基于最新的前端技术栈，包括 React18,ReactRouter V6, Vite5, TypeScript, Redux/toolkit 和 UnoCSS。它内置了丰富的主题配置和组件，代码规范严谨，实现了自动化的文件路由系统。

#### 文档

- [地址](https://react-soybean-docs.ohh-889.com/index-cn?theme=dark)

## 特性

- **前沿技术应用**：采用 React18, ReactRouter V6,Vite5, TypeScript, Redux/toolkit 和 UnoCSS 等最新流行的技术栈。
- **清晰的项目架构**：采用 pnpm monorepo 架构，结构清晰，优雅易懂。
- **严格的代码规范**：遵循 [SoybeanJS 规范](https://docs.soybeanjs.cn/zh/standard)，集成了eslint, prettier 和 simple-git-hooks，保证代码的规范性。
- **TypeScript**： 通过支持严格的类型检查和内置多个 hook 的类型推导，仅需定义简洁的类型，即可享受便捷的 TypeScript 类型提示，显著提升代码的可维护性。
- **丰富的主题配置**：内置多样的主题配置，与 UnoCSS 完美结合。
- **内置国际化方案**：轻松实现多语言支持。
- **丰富的路由功能**：基于 React-Router V6 扩展了路由 API，提供类似 Vue-Router 的便捷使用体验，让路由管理更加灵活高效。
- **自动化文件路由系统**：约定式路由,自动生成路由导入、声明和类型。更多细节请查看 [Elegant Router](https://github.com/mufeng889/react-auto-route)。
- **灵活的权限路由**：同时支持前端静态路由和后端动态路由。
- **丰富的页面组件**：内置多样页面和组件，包括403、404、500页面，以及布局组件、标签组件、主题配置组件等。
- **命令行工具**：内置高效的命令行工具，git提交、删除文件、发布等。
- **移动端适配**：完美支持移动端，实现自适应布局。
- **良好UI**：在发生错误的时候自动捕获错误，并显示友好界面，帮助用户快速定位和解决问题，还可以再组件内监控埋点上报。

## 使用

**环境准备**

确保你的环境满足以下要求：

- **git**: 你需要git来克隆和管理项目版本。
- **NodeJS**: >=18.12.0，推荐 18.19.0 或更高。
- **pnpm**: >= 8.7.0，推荐 8.14.0 或更高。

**安装依赖**

```bash
pnpm i
```

> 由于本项目采用了 pnpm monorepo 的管理方式，因此请不要使用 npm 或 yarn 来安装依赖。

**启动项目**

```bash
pnpm dev
```

**构建项目**

```bash
pnpm build
```
