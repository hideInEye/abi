import { APPOINT_OPTIONS } from '@/constants/job';

interface PropsType {
  setState: (field: string, reset: any) => void;
  state: any;
}

const HourRadio: FC<PropsType> = memo(({ setState, state }) => {
  const options = [
    {
      label: '小时，允许的通配符[, - * /]',
      value: 1
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
            onChange={val => setState('hour', { cycleStart: val })}
          />
          -
          <AInputNumber
            className="mx-2"
            max={59}
            min={state.cycleStart + 1}
            value={state.cycleEnd}
            onChange={val => setState('hour', { cycleEnd: val })}
          />
          小时
        </div>
      ),
      value: 2
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
            onChange={val => setState('hour', { startTime: val })}
          />
          小时开始，每
          <AInputNumber
            className="mx-2"
            max={59 - state.startTime}
            min={1}
            value={state.eachTime}
            onChange={val => setState('hour', { eachTime: val })}
          />
          小时执行一次
        </div>
      ),
      value: 3
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
            onChange={val => setState('hour', { appoint: val })}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      ),
      value: 4
    }
  ];
  return (
    <ARadio.Group
      options={options}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      value={state.selected}
      onChange={e => {
        setState('hour', { selected: e.target.value });
      }}
    />
  );
});

export default HourRadio;
