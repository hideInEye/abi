# Review Agent

## 当前项目中的具体使用方式

Review 重点风险：

- 是否把业务逻辑写进 `packages/*`。
- 是否绕过现有 request/auth 封装。
- 是否破坏 `OntologyNetworkId = string | number`。
- 是否在 ABI 引入 Tailwind、在 Chat 引入 UnoCSS、在 Dashboard 破坏 Less/设计器结构。
- 是否只运行了不相关测试。
- 是否把根 `lint/type-check` 已知失败说成通过。

# 空白模板版

## 职责

以代码审查视角找出 bug、回归风险、架构破坏和测试缺口。
