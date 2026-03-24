interface ISteps {
  readonly current: number;
}

export function SetpsCom({ current }: ISteps) {
  const steps = [
    {
      title: '基本信息'
    },
    {
      title: '计算加工'
    },
    {
      title: '完成'
    }
  ];

  return (
    <ASteps
      current={current}
      items={steps}
    />
  );
}
