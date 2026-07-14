# 运行记录：首页数据资产标题边距对齐

## 目标
将首页"数据资产"标题的上下边距，与"我的空间"和"创建引导"标题保持一致。

## 影响范围
- 仅影响 `apps/abi/src/pages/home/index.tsx` 中数据资产 `HomeTitle` 的 className。
- 不涉及数据获取、业务逻辑或 API 调用。

## 修改内容
文件：`apps/abi/src/pages/home/index.tsx`

为"数据资产"标题添加与"我的空间"、"创建引导"相同的 `section-title-spacious` 类名：

```tsx
<HomeTitle title="数据资产" className={s['section-title-spacious']} />
```

对应样式 `section-title-spacious` 定义在 `apps/abi/src/pages/home/index.module.scss`：

```scss
.section-title-spacious {
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}
```

## 验证
- 读取修改后的文件，确认三个标题均使用 `section-title-spacious` 类名。
- `GetProblems` 因语言服务器未就绪未返回结果，但修改仅为 className 字符串变更，无语法/类型风险。

## 回归检查
- "我的空间"、"创建引导"标题样式不变。
- "数据资产"标题获得与上述两个标题一致的上下边距，首页三个区块标题视觉对齐。

## AI 资产更新
本次为单一 UI 样式微调整，无需更新 `.ai/prompts/`、`.ai/agents/`、`.ai/skills/`、`.ai/mcp/`、`.ai/context/`、`.ai/checklists/` 或 `.ai/decisions/`。
