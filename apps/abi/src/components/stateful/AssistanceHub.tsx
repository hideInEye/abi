import { Tree } from 'antd'
import type { GetProps, TreeDataNode } from 'antd'
import CommonDrawer from '@/components/stateless/common/CommonDrawer'
import React from 'react'

type DirectoryTreeProps = GetProps<typeof Tree.DirectoryTree>

const { DirectoryTree } = Tree

const treeData: TreeDataNode[] = [
  {
    children: [
      { isLeaf: true, key: '0-0-0', title: '快速入门' },
      { isLeaf: true, key: '0-0-1', title: '快速注销' },
    ],
    key: '0-0',
    title: '快速入门',
  },
  {
    children: [
      { isLeaf: true, key: '0-1-0', title: '数据准备与建模' },
      { isLeaf: true, key: '0-1-1', title: '数据准备与建模' },
    ],
    key: '0-1',
    title: '数据准备与建模',
  },
]

const AssistanceHub: React.FC = () => {
  const [open, setOpen] = useState(true)

  const onSelect: DirectoryTreeProps['onSelect'] = (keys, info) => {
    console.log('Trigger Select', keys, info)
  }

  const onExpand: DirectoryTreeProps['onExpand'] = (keys, info) => {
    console.log('Trigger Expand', keys, info)
  }

  return (
    <CommonDrawer open={open} title="帮助中心" width={800} onClose={() => setOpen(false)}>
      <div className="grid grid-cols-[1fr_2fr] gap-1">
        <DirectoryTree defaultExpandAll draggable multiple treeData={treeData} onExpand={onExpand} onSelect={onSelect} />
        <div>
          <p className="text-lg font-bold">帮助中心</p>
          <p className="mt-4 rounded-lg bg-gray-100/70 p-4 line-height-7">
            在这个快节奏的时代，人们常常被生活的压力所裹挟，忘记了停下脚步去感受身边的美好。清晨的第一缕阳光透过窗帘洒进房间，带来一天的希望与温暖；午后的一杯咖啡，伴随着书页翻动的声音，让人沉浸在片刻的宁静中；傍晚的夕阳染红了天空，仿佛在提醒我们，每一天的结束都是新的开始。生活或许忙碌，但只要我们愿意，总能在平凡的日子里找到属于自己的小确幸。无论是与家人共度的温馨时光，还是独自一人漫步在街头，感受微风拂面的惬意，都是生活赋予我们的珍贵礼物。让我们学会放慢脚步，用心去感受每一个瞬间，因为正是这些看似微不足道的细节，构成了我们独一无二的人生。
          </p>
        </div>
      </div>
    </CommonDrawer>
  )
}

export default AssistanceHub
