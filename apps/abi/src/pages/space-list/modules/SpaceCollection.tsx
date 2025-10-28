import { CloseOutlined, DeleteOutlined, EditOutlined, TeamOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';

import SpaceFeatureSet from './SpaceFeatureSet';

export default function SpaceCollection() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [timerWidth, setTimerWidth] = useState<number>(0);
  const timerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (timerRef.current) {
      const width = timerRef.current.getBoundingClientRect().width;
      setTimerWidth(width);
    }
  }, []);

  const dataAssets = [
    {
      createPerson: '张三',
      createTime: '2024-01-01',
      id: '1',
      name: '风控空间',
      num: 38,
      tag: '风控'
    },
    {
      createPerson: '李四',
      createTime: '2024-01-01',
      id: '2',
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '王五',
      createTime: '2024-01-01',
      id: '3',
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '赵六',
      createTime: '2024-01-01',
      id: '4',
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '赵六',
      createTime: '2024-01-01',
      id: '5',
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '张三',
      createTime: '2024-01-01',
      id: '6',
      name: '风控空间',
      num: 38,
      tag: '风控'
    },
    {
      createPerson: '李四',
      createTime: '2024-01-01',
      id: '7',
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '王五',
      createTime: '2024-01-01',
      id: '8',
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '赵六',
      createTime: '2024-01-01',
      id: '9',
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '赵六',
      createTime: '2024-01-01',
      id: '10',
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    }
  ];

  return (
    <section>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {dataAssets.map(item => (
          <ACard
            className="flex flex-col"
            key={item.id}
          >
            <div className="flex flex-col text-sm font-bold">{item.name}</div>
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-2 text-xs op80">
              <div className="flex justify-between">
                <span className="w-13">创建人</span>
                <span
                  className="text-left"
                  style={{ width: timerWidth }}
                >
                  {item.createPerson}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="w-13">标签</span>
                <span
                  className="text-left"
                  style={{ width: timerWidth }}
                >
                  {item.tag}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="w-13">创建时间</span>
                <span
                  className="timeer text-left"
                  ref={timerRef}
                >
                  {item.createTime}
                </span>
              </div>
            </div>

            <div className="mt4 flex items-center justify-between">
              <div className="flex items-center gap-2 op70">
                <TeamOutlined size={15} />
                <span className="text-xs font-400">{item.num}</span>
              </div>
              <div className="flex justify-end">
                <AButton
                  color="primary"
                  icon={<EditOutlined />}
                  size="small"
                  variant="link"
                  onClick={() => setDrawerOpen(!drawerOpen)}
                />
                <AButton
                  color="danger"
                  icon={<DeleteOutlined />}
                  size="small"
                  variant="link"
                />
              </div>
            </div>
          </ACard>
        ))}
      </div>

      <div className="flex justify-end gap-6 py6">
        <APagination
          defaultCurrent={6}
          total={500}
        />
      </div>

      <ADrawer
        closeIcon={null}
        extra={<CloseOutlined onClick={() => setDrawerOpen(false)} />}
        open={drawerOpen}
        title="编辑空间"
        width={900}
        footer={
          <AFlex
            className="gap-6 py-6"
            justify="flex-end"
          >
            <AButton
              type="default"
              onClick={() => setDrawerOpen(false)}
            >
              取消
            </AButton>
            <AButton
              type="primary"
              onClick={() => setDrawerOpen(false)}
            >
              确定
            </AButton>
          </AFlex>
        }
        onClose={() => setDrawerOpen(false)}
      >
        <SpaceFeatureSet />
      </ADrawer>
    </section>
  );
}
