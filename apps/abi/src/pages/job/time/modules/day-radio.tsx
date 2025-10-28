import { APPOINT_OPTIONS } from '@/constants/job';

interface PropsType {
  setState: (field: string, reset: any) => void;
  state: any;
}

const DayRadio: FC<PropsType> = memo(({ setState, state }) => {
  const options = [
    {
      label: ' 日，允许的通配符[, - * ? / L W] ',
      value: 1
    },
    {
      label: '不指定',
      value: 2
    },
    {
      label: (
        <div>
          周期从
          <AInputNumber
            className="mx-2"
            max={58}
            min={0}
            value={state.cycleStart}
            onChange={val => setState('day', { cycleStart: val })}
          />
          -
          <AInputNumber
            className="mx-2"
            max={59}
            min={state.cycleStart + 1}
            value={state.cycleEnd}
            onChange={val => setState('day', { cycleEnd: val })}
          />
          日
        </div>
      ),
      value: 3
    },
    {
      label: (
        <div>
          从
          <AInputNumber
            className="mx-2"
            max={58}
            min={0}
            value={state.startTime}
            onChange={val => setState('day', { startTime: val })}
          />
          日开始，每
          <AInputNumber
            className="mx-2"
            max={59 - state.startTime}
            min={1}
            value={state.eachTime}
            onChange={val => setState('day', { eachTime: val })}
          />
          日执行一次
        </div>
      ),
      value: 4
    },
    {
      label: (
        <div>
          每月
          <AInputNumber
            className="mx-2"
            max={31}
            min={1}
            value={state.eachStart}
            onChange={val => setState('day', { eachStart: val })}
          />
          号最近的那个工作日
        </div>
      ),
      value: 5
    },
    {
      label: '本月最后一天',
      value: 6
    },
    {
      label: (
        <div>
          指定
          <ASelect
            className="ml-2 w-[300px]"
            mode="multiple"
            options={APPOINT_OPTIONS}
            placeholder="可多选"
            value={state.appoint}
            onChange={val => setState('day', { appoint: val })}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      ),
      value: 7
    }
  ];
  return (
    <ARadio.Group
      options={options}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      value={state.selected}
      onChange={e => {
        setState('day', { selected: e.target.value });
      }}
    />
  );
});

export default DayRadio;
