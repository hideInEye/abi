# Tech Debt

## 测试债

- 共享包缺少测试：`packages/auth`、`packages/axios`、`packages/simple-router`。
- 三个 app 缺少组件测试和 E2E。
- Dashboard 设计器核心逻辑缺少 characterization tests。

## 类型债

- 复杂业务代码存在大量 `any`，例如 Chat conversation controller 和部分 API/页面。
- Chat Redux store 存在但 Provider 注释，状态体系需要确认。
- API 返回类型不集中，部分 request transform 使用宽松 fallback。

## 架构债

- 三个 app 的路由/状态/样式体系差异大，需要文档和边界约束维持一致性。
- 微前端路径、代理和部署配置分散在 Vite、Nginx、env、runtime config 中。
- 内网地址硬编码在开发/部署配置中，环境切换成本较高。

## 文档债

- 当前工作区 README 处于删除状态，仓库对人类开发者的入口文档缺失。
- 未发现集中 API 契约文档。
- 未发现 CI/CD 文档。

## 处理优先级

1. 先补共享鉴权和请求测试。
2. 再补 ABI ontology/data-preparation 关键 domain tests。
3. 再补 Chat conversation helpers 测试。
4. 最后补 Dashboard manager characterization tests 和 Playwright smoke。
