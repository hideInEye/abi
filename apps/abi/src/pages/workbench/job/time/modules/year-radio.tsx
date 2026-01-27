import dayjs from 'dayjs';

import { YEAR_OPTIONS } from '@/constants/job';

interface PropsType {
  setState: (field: string, reset: any) => void;
  state: any;
}

const YearRadio: FC<PropsType> = memo(({ setState, state }) => {
  const options = [
    {
      label: '不填，允许的通配符[, - * /]',
      value: 1
    },
    {
      label: '每年',
      value: 2
    },
    {
      label: (
        <div>
          周期从
          <AInputNumber
            className="mx-2"
            max={2099}
            min={dayjs().year()}
            value={state.cycleStart}
            onChange={val => setState('year', { cycleStart: val })}
          />
          -
          <AInputNumber
            className="mx-2"
            max={2099}
            min={state.cycleStart + 1}
            value={state.cycleEnd}
            onChange={val => setState('year', { cycleEnd: val })}
          />
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
            max={2099}
            min={dayjs().year()}
            value={state.startTime}
            onChange={val => setState('year', { startTime: val })}
          />
          年开始，每
          <AInputNumber
            className="mx-2"
            max={2099 - state.startTime}
            min={1}
            value={state.eachTime}
            onChange={val => setState('year', { eachTime: val })}
          />
          年执行一次
        </div>
      ),
      value: 4
    },
    {
      label: (
        <div>
          指定
          <ASelect
            className="ml-2 w-[300px]"
            mode="multiple"
            options={YEAR_OPTIONS}
            placeholder="可多选"
            value={state.appoint}
            onChange={val => setState('year', { appoint: val })}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
          />
        </div>
      ),
      value: 5
    }
  ];
  return (
    <ARadio.Group
      options={options}
      style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
      value={state.selected}
      onChange={e => {
        setState('year', { selected: e.target.value });
      }}
    />
  );
});

export default YearRadio;
