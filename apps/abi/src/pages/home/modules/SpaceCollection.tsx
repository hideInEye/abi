import React, { useEffect, useRef, useState } from 'react';

export default function SpaceCollection() {
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
      id: 1,
      name: '风控空间',
      num: 38,
      tag: '风控'
    },
    {
      createPerson: '李四',
      createTime: '2024-01-01',
      id: 2,
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '王五',
      createTime: '2024-01-01',
      id: 3,
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    },
    {
      createPerson: '赵六',
      createTime: '2024-01-01',
      id: 4,
      name: '数据分析空间',
      num: 38,
      tag: '数据分析'
    }
  ];

  return (
    <div className="rd-20px bg-container p-4">
      <div className="flex items-center gap-4">
        {dataAssets.map(item => (
          <div
            className="flex flex-col border border-gray-200 rounded-lg p2"
            key={item.id}
          >
            <div className="flex flex-col text-sm font-bold">{item.name}</div>
            <div className="mt-2 flex flex-col gap-2 border-t border-gray-100 pt-2 text-xs op80">
              <div className="flex justify-between">
                <span className="w-13">创建人</span>
                <span
                  className="ml-6 text-left"
                  style={{ width: timerWidth }}
                >
                  {item.createPerson}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="w-13">标签</span>
                <span
                  className="ml-6 text-left"
                  style={{ width: timerWidth }}
                >
                  {item.tag}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="w-13">创建时间</span>
                <span
                  className="timeer ml-6 text-left"
                  ref={timerRef}
                >
                  {item.createTime}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
