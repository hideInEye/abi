import { WEEK_OPTIONS } from '@/constants/job';

interface PropsType {
  setState: (field: string, reset: any) => void;
  state: any;
}

const WeekRadio: FC<PropsType> = memo(({ setState, state }) => {
  const options = [
    {
      label: ' 周，允许的通配符[, - * ? / L #] ',
      value: 1
    },
    {
      label: '不指定',
      value: 2
    },
    {
      label: (
        <div>
          周期从星期
          <ASelect
            className="mx-2"
            options={WEEK_OPTIONS}
            value={state.cycleStart}
            onChange={val => setState('week', { cycleStart: val })}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
          -
          <ASelect
            className="mx-2"
            options={WEEK_OPTIONS}
            value={state.cycleEnd}
            onChange={val => setState('week', { cycleEnd: val })}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      ),
      value: 3
    },
    {
      label: (
        <div>
          第
          <AInputNumber
            className="mx-2"
            max={4}
            min={1}
            value={state.startTime}
            onChange={val => setState('week', { startTime: val })}
          />
          周的星期
          <ASelect
            className="ml-2"
            options={WEEK_OPTIONS}
            value={state.eachTime}
            onChange={val => setState('week', { eachTime: val })}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      ),
      value: 4
    },
    {
      label: (
        <div>
          本月最后一个星期
          <ASelect
            className="ml-2"
            options={WEEK_OPTIONS}
            value={state.eachStart}
            onChange={val => setState('week', { eachStart: val })}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      ),
      value: 5
    },
    {
      label: (
        <div>
          指定
          <ASelect
            className="ml-2 w-[300px]"
            mode="multiple"
            options={WEEK_OPTIONS}
            placeholder="可多选"
            value={state.appoint}
            onChange={val => setState('week', { appoint: val })}
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
        setState('week', { selected: e.target.value });
      }}
    />
  );
});

export default WeekRadio;
