import type { TreeDataNode } from 'antd';

export default function Component() {
  const onSelect = () => {};

  const onCheck = () => {};

  const treeData: TreeDataNode[] = [
    {
      children: [],
      key: '0-0',
      title: '智能助手'
    },
    {
      children: [],
      key: '0-1',
      title: '分享管理'
    },
    {
      children: [],
      key: '0-2',
      title: '助手管理'
    },
    {
      children: [
        {
          key: '0-3-0',
          title: '快速创建'
        }
      ],
      key: '0-3',
      title: '数据准备'
    }
  ];

  return (
    <section className="p-2">
      <div className="p-5">
        <div className="grid grid-cols-2 gap-4">
          <div className="f-v-b">
            <label>角色名称</label>
            <AInput
              className="ml4 flex-1"
              placeholder="输入角色名称"
            />
          </div>
          <div className="f-v-b">
            <label>角色标识</label>
            <AInput
              className="ml4 flex-1"
              placeholder="输入角色标识"
            />
          </div>
        </div>
        <div className="mt6 f-v-b">
          <label>角色描述</label>
          <AInput
            className="ml4 flex-1"
            placeholder="输入角色描述"
          />
        </div>
      </div>

      <div className="f-v p-5">
        <label>角色权限</label>
        <div className="ml4 h-full w-full flex-1 rd-8px bg-gray-1 p-5">
          <ATree
            checkable
            treeData={treeData}
            onCheck={onCheck}
            onSelect={onSelect}
          />
        </div>
      </div>
    </section>
  );
}
