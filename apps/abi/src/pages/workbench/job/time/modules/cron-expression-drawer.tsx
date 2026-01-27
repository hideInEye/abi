import { Typography } from 'antd';
import dayjs from 'dayjs';

import DayRadio from './day-radio';
import HourRadio from './hour-radio';
import MinRadio from './min-radio';
import MonthRadio from './month-radio';
import SecRadio from './sec-radio';
import { checkDate, formatDate, getAssignArr, getAverageArr, getCycleArr, getIndex, getOrderArr } from './utils';
import WeekRadio from './week-radio';
import YearRadio from './year-radio';

const { Paragraph, Title } = Typography;
type Props = {
  onClose: (val?: string) => void;
};

const initState = {
  day: {
    // 每X执行一次
    appoint: undefined, // 周期开始
    cycleEnd: 2, // 单选
    cycleStart: 1, // 指定
    eachStart: 1, // 从X开始
    eachTime: 1,
    selected: 1, // 周期结束
    startTime: 0 // 每月X号开始
  },
  hour: {
    // 每X执行一次
    appoint: undefined, // 周期开始
    cycleEnd: 2, // 单选
    cycleStart: 1, // 从X开始
    eachTime: 1,
    selected: 1, // 周期结束
    startTime: 0 // 指定
  },
  min: {
    // 每X执行一次
    appoint: undefined, // 周期开始
    cycleEnd: 2, // 单选
    cycleStart: 1, // 从X开始
    eachTime: 1,
    selected: 1, // 周期结束
    startTime: 0 // 指定
  },
  month: {
    // 每X执行一次
    appoint: undefined, // 周期开始
    cycleEnd: 2, // 单选
    cycleStart: 1, // 从X开始
    eachTime: 1,
    selected: 1, // 周期结束
    startTime: 1 // 指定
  },
  sec: {
    appoint: undefined, // 周期开始
    cycleEnd: 2, // 单选
    cycleStart: 1, // 从X开始
    eachTime: 1, // 每X执行一次
    selected: 1, // 周期结束
    startTime: 0 // 指定
  },
  week: {
    // 第几周的星期X
    appoint: undefined, // 周期开始
    cycleEnd: 3, // 单选
    cycleStart: 2, // 指定
    eachStart: 2, // 第X周
    eachTime: 2,
    selected: 2, // 周期结束
    startTime: 1 // 本月最后一个星期X
  },
  year: {
    // 每X执行一次
    appoint: undefined, // 周期开始
    cycleEnd: dayjs().year() + 1, // 单选
    cycleStart: dayjs().year(), // 从X开始
    eachTime: 1,
    selected: 1, // 周期结束
    startTime: dayjs().year() // 指定
  }
};

const reducer = (allState: typeof initState, field: any) => {
  return {
    ...allState,
    ...field
  };
};

const CronExpressionDrawer: FC<Props> = memo(({ onClose }) => {
  const [allState, dispatch] = useReducer(reducer, initState);
  const [activeKey, setActiveKey] = useState('sec'); // 年月日时分秒

  const sec = useMemo(() => {
    const { appoint, cycleEnd, cycleStart, eachTime, selected, startTime } = allState.sec;
    let res = '*';
    switch (selected) {
      case 1:
        res = '*';
        break;
      case 2:
        res = `${cycleStart}-${cycleEnd}`;
        break;
      case 3:
        res = `${startTime}/${eachTime}`;
        break;
      case 4:
        res = appoint ? appoint.join(',') : '*';
        break;
      default:
        res = '*';
        break;
    }
    return res;
  }, [allState.sec]);

  const min = useMemo(() => {
    const { appoint, cycleEnd, cycleStart, eachTime, selected, startTime } = allState.min;
    let res = '*';
    switch (selected) {
      case 1:
        res = '*';
        break;
      case 2:
        res = `${cycleStart}-${cycleEnd}`;
        break;
      case 3:
        res = `${startTime}/${eachTime}`;
        break;
      case 4:
        res = appoint ? appoint.join(',') : '*';
        break;
      default:
        res = '*';
        break;
    }
    return res;
  }, [allState.min]);

  const hour = useMemo(() => {
    const { appoint, cycleEnd, cycleStart, eachTime, selected, startTime } = allState.hour;
    let res = '*';
    switch (selected) {
      case 1:
        res = '*';
        break;
      case 2:
        res = `${cycleStart}-${cycleEnd}`;
        break;
      case 3:
        res = `${startTime}/${eachTime}`;
        break;
      case 4:
        res = appoint ? appoint.join(',') : '*';
        break;
      default:
        res = '*';
        break;
    }
    return res;
  }, [allState.hour]);

  const day = useMemo(() => {
    const { appoint, cycleEnd, cycleStart, eachStart, eachTime, selected, startTime } = allState.day;
    let res = '*';
    switch (selected) {
      case 1:
        res = '*';
        break;
      case 2:
        res = '?';
        break;
      case 3:
        res = `${cycleStart}-${cycleEnd}`;
        break;
      case 4:
        res = `${startTime}/${eachTime}`;
        break;
      case 5:
        res = `${eachStart}W`;
        break;
      case 6:
        res = 'L';
        break;
      case 7:
        res = appoint ? appoint.join(',') : '*';
        break;
      default:
        res = '*';
        break;
    }
    return res;
  }, [allState.day]);

  const month = useMemo(() => {
    const { appoint, cycleEnd, cycleStart, eachTime, selected, startTime } = allState.month;
    let res = '*';
    switch (selected) {
      case 1:
        res = '*';
        break;
      case 2:
        res = `${cycleStart}-${cycleEnd}`;
        break;
      case 3:
        res = `${startTime}/${eachTime}`;
        break;
      case 4:
        res = appoint ? appoint.join(',') : '*';
        break;
      default:
        res = '*';
        break;
    }
    return res;
  }, [allState.month]);

  const week = useMemo(() => {
    const { appoint, cycleEnd, cycleStart, eachStart, eachTime, selected, startTime } = allState.week;
    let res = '*';
    switch (selected) {
      case 1:
        res = '*';
        break;
      case 2:
        res = '?';
        break;
      case 3:
        res = `${cycleStart}-${cycleEnd}`;
        break;
      case 4:
        res = `${eachTime}#${startTime}`;
        break;
      case 5:
        res = `${eachStart}L`;
        break;
      case 7:
        res = appoint ? appoint.join(',') : '*';
        break;
      default:
        res = '*';
        break;
    }
    return res;
  }, [allState.week]);

  const year = useMemo(() => {
    const { appoint, cycleEnd, cycleStart, eachTime, selected, startTime } = allState.year;
    let res = '';
    switch (selected) {
      case 1:
        res = '';
        break;
      case 2:
        res = '*';
        break;
      case 3:
        res = `${cycleStart}-${cycleEnd}`;
        break;
      case 4:
        res = `${startTime}/${eachTime}`;
        break;
      case 5:
        res = appoint ? appoint.join(',') : '';
        break;
      default:
        res = '';
        break;
    }
    return res;
  }, [allState.year]);

  const cronExpression = useMemo(() => {
    return `${sec} ${min} ${hour} ${day} ${month} ${week}${year ? ` ${year}` : ''}`;
  }, [sec, min, hour, day, month, week, year]);

  // 展示结果逻辑
  const dateArr: any = [];
  let dayRule: string = '';
  let dayRuleSup: any = '';

  // 获取"年"数组
  function getYearArr(rule, year) {
    dateArr[5] = getOrderArr(year, year + 100);
    if (rule !== undefined) {
      if (rule.includes('-')) {
        dateArr[5] = getCycleArr(rule, year + 100, false);
      } else if (rule.includes('/')) {
        dateArr[5] = getAverageArr(rule, year + 100);
      } else if (rule !== '*') {
        dateArr[5] = getAssignArr(rule);
      }
    }
  }
  // 获取"月"数组
  function getMonthArr(rule) {
    dateArr[4] = getOrderArr(1, 12);
    if (rule.includes('-')) {
      dateArr[4] = getCycleArr(rule, 12, false);
    } else if (rule.includes('/')) {
      dateArr[4] = getAverageArr(rule, 12);
    } else if (rule !== '*') {
      dateArr[4] = getAssignArr(rule);
    }
  }
  // 获取"日"数组-主要为日期规则
  function getWeekArr(rule: any) {
    // 只有当日期规则的两个值均为“”时则表达日期是有选项的
    if (dayRule == '' && dayRuleSup == '') {
      if (rule.includes('-')) {
        dayRule = 'weekDay';
        dayRuleSup = getCycleArr(rule, 7, false);
      } else if (rule.includes('#')) {
        dayRule = 'assWeek';
        const matchRule = rule.match(/[0-9]{1}/g);
        dayRuleSup = [Number(matchRule[1]), Number(matchRule[0])];
        dateArr[3] = [1];
        if (dayRuleSup[1] == 7) {
          dayRuleSup[1] = 0;
        }
      } else if (rule.includes('L')) {
        dayRule = 'lastWeek';
        dayRuleSup = Number(rule.match(/[0-9]{1,2}/g)[0]);
        dateArr[3] = [31];
        if (dayRuleSup == 7) {
          dayRuleSup = 0;
        }
      } else if (rule !== '*' && rule !== '?') {
        dayRule = 'weekDay';
        dayRuleSup = getAssignArr(rule);
      }
    }
  }
  // 获取"日"数组-少量为日期规则
  function getDayArr(rule: any) {
    dateArr[3] = getOrderArr(1, 31);
    dayRule = '';
    dayRuleSup = '';
    if (rule.includes('-')) {
      dateArr[3] = getCycleArr(rule, 31, false);
      dayRuleSup = 'null';
    } else if (rule.includes('/')) {
      dateArr[3] = getAverageArr(rule, 31);
      dayRuleSup = 'null';
    } else if (rule.includes('W')) {
      dayRule = 'workDay';
      dayRuleSup = Number(rule.match(/[0-9]{1,2}/g)[0]);
      dateArr[3] = [dayRuleSup];
    } else if (rule.includes('L')) {
      dayRule = 'lastDay';
      dayRuleSup = 'null';
      dateArr[3] = [31];
    } else if (rule !== '*' && rule !== '?') {
      dateArr[3] = getAssignArr(rule);
      dayRuleSup = 'null';
    } else if (rule == '*') {
      dayRuleSup = 'null';
    }
  }
  // 获取"时"数组
  function getHourArr(rule: any) {
    dateArr[2] = getOrderArr(0, 23);
    if (rule.includes('-')) {
      dateArr[2] = getCycleArr(rule, 24, true);
    } else if (rule.includes('/')) {
      dateArr[2] = getAverageArr(rule, 23);
    } else if (rule !== '*') {
      dateArr[2] = getAssignArr(rule);
    }
  }
  // 获取"分"数组
  function getMinArr(rule: any) {
    dateArr[1] = getOrderArr(0, 59);
    if (rule.includes('-')) {
      dateArr[1] = getCycleArr(rule, 60, true);
    } else if (rule.includes('/')) {
      dateArr[1] = getAverageArr(rule, 59);
    } else if (rule !== '*') {
      dateArr[1] = getAssignArr(rule);
    }
  }
  // 获取"秒"数组
  function getSecondArr(rule: any) {
    dateArr[0] = getOrderArr(0, 59);
    if (rule.includes('-')) {
      dateArr[0] = getCycleArr(rule, 60, true);
    } else if (rule.includes('/')) {
      dateArr[0] = getAverageArr(rule, 59);
    } else if (rule !== '*') {
      dateArr[0] = getAssignArr(rule);
    }
  }

  // eslint-disable-next-line complexity
  const resultList = useMemo(() => {
    // 计算开始-隐藏结果
    // this.isShow = false;
    // 获取规则数组[0秒、1分、2时、3日、4月、5星期、6年]
    // let ruleArr = this.$options.propsData.ex.split(' ');
    const ruleArr = cronExpression.split(' ');
    // 用于记录进入循环的次数
    let nums = 0;
    // 用于暂时存符号时间规则结果的数组
    const resultArr = [];
    // 获取当前时间精确至[年、月、日、时、分、秒]
    const nTime = new Date();
    const nYear = nTime.getFullYear();
    let nMonth = nTime.getMonth() + 1;
    let nDay = nTime.getDate();
    let nHour = nTime.getHours();
    let nMin = nTime.getMinutes();
    let nSecond = nTime.getSeconds();
    // 根据规则获取到近100年可能年数组、月数组等等
    getSecondArr(ruleArr[0]);
    getMinArr(ruleArr[1]);
    getHourArr(ruleArr[2]);
    getDayArr(ruleArr[3]);
    getMonthArr(ruleArr[4]);
    getWeekArr(ruleArr[5]);
    getYearArr(ruleArr[6], nYear);
    // 将获取到的数组赋值-方便使用
    const sDate = dateArr[0];
    const mDate = dateArr[1];
    const hDate = dateArr[2];
    const DDate = dateArr[3];
    const MDate = dateArr[4];
    const YDate = dateArr[5];
    // 获取当前时间在数组中的索引
    let sIdx = getIndex(sDate, nSecond);
    let mIdx = getIndex(mDate, nMin);
    let hIdx = getIndex(hDate, nHour);
    let DIdx = getIndex(DDate, nDay);
    let MIdx = getIndex(MDate, nMonth);
    const YIdx = getIndex(YDate, nYear);
    // 重置月日时分秒的函数(后面用的比较多)
    const resetSecond = () => {
      sIdx = 0;
      nSecond = sDate[sIdx];
    };
    const resetMin = () => {
      mIdx = 0;
      nMin = mDate[mIdx];
      resetSecond();
    };
    const resetHour = () => {
      hIdx = 0;
      nHour = hDate[hIdx];
      resetMin();
    };
    const resetDay = () => {
      DIdx = 0;
      nDay = DDate[DIdx];
      resetHour();
    };
    const resetMonth = () => {
      MIdx = 0;
      nMonth = MDate[MIdx];
      resetDay();
    };
    // 如果当前年份不为数组中当前值
    if (nYear !== YDate[YIdx!]) {
      resetMonth();
    }
    // 如果当前月份不为数组中当前值
    if (nMonth !== MDate[MIdx!]) {
      resetDay();
    }
    // 如果当前“日”不为数组中当前值
    if (nDay !== DDate[DIdx!]) {
      resetHour();
    }
    // 如果当前“时”不为数组中当前值
    if (nHour !== hDate[hIdx!]) {
      resetMin();
    }
    // 如果当前“分”不为数组中当前值
    if (nMin !== mDate[mIdx!]) {
      resetSecond();
    }
    // 循环年份数组
    goYear: for (let Yi = YIdx; Yi < YDate.length; Yi++) {
      const YY = YDate[Yi];
      // 如果到达最大值时
      if (nMonth > MDate[MDate.length - 1]) {
        resetMonth();
        continue;
      }
      // 循环月份数组
      goMonth: for (let Mi = MIdx; Mi < MDate.length; Mi++) {
        console.log('循环月', Mi);

        // 赋值、方便后面运算
        let MM = MDate[Mi];
        MM = MM < 10 ? `0${MM}` : MM;
        // 如果到达最大值时
        if (nDay > DDate[DDate.length - 1]) {
          resetDay();
          if (Mi == MDate.length - 1) {
            resetMonth();
            continue goYear;
          }
          continue;
        }
        // 循环日期数组
        goDay: for (let Di = DIdx; Di < DDate.length; Di++) {
          console.log('循环日', Di);
          // 赋值、方便后面运算
          let DD = DDate[Di];
          let thisDD = DD < 10 ? `0${DD}` : DD;
          // 如果到达最大值时
          if (nHour > hDate[hDate.length - 1]) {
            resetHour();
            if (Di == DDate.length - 1) {
              resetDay();
              if (Mi == MDate.length - 1) {
                resetMonth();
                continue goYear;
              }
              continue goMonth;
            }
            continue;
          }

          // 判断日期的合法性，不合法的话也是跳出当前循环
          if (
            checkDate(`${YY}-${MM}-${thisDD} 00:00:00`) !== true &&
            dayRule !== 'workDay' &&
            dayRule !== 'lastWeek' &&
            dayRule !== 'lastDay'
          ) {
            resetDay();
            continue goMonth;
          }
          // 如果日期规则中有值时
          if (dayRule == 'lastDay') {
            // 如果不是合法日期则需要将前将日期调到合法日期即月末最后一天

            if (checkDate(`${YY}-${MM}-${thisDD} 00:00:00`) !== true) {
              while (DD > 0 && checkDate(`${YY}-${MM}-${thisDD} 00:00:00`) !== true) {
                DD--;

                thisDD = DD < 10 ? `0${DD}` : DD;
              }
            }
          } else if (dayRule == 'workDay') {
            // 校验并调整如果是2月30号这种日期传进来时需调整至正常月底
            if (checkDate(`${YY}-${MM}-${thisDD} 00:00:00`) !== true) {
              while (DD > 0 && checkDate(`${YY}-${MM}-${thisDD} 00:00:00`) !== true) {
                DD--;
                thisDD = DD < 10 ? `0${DD}` : DD;
              }
            }
            // 获取达到条件的日期是星期X
            const thisWeek = formatDate(new Date(`${YY}-${MM}-${thisDD} 00:00:00`), 'week');
            // 当星期日时
            if (thisWeek == 1) {
              // 先找下一个日，并判断是否为月底
              DD++;
              thisDD = DD < 10 ? `0${DD}` : DD;
              // 判断下一日已经不是合法日期
              if (checkDate(`${YY}-${MM}-${thisDD} 00:00:00`) !== true) {
                DD -= 3;
              }
            } else if (thisWeek == 7) {
              // 当星期6时只需判断不是1号就可进行操作
              if (dayRuleSup !== 1) {
                DD--;
              } else {
                DD += 2;
              }
            }
          } else if (dayRule == 'weekDay') {
            // 如果指定了是星期几
            // 获取当前日期是属于星期几
            const thisWeek = formatDate(new Date(`${YY}-${MM}-${DD} 00:00:00`), 'week');
            // 校验当前星期是否在星期池（dayRuleSup）中
            if (!dayRuleSup.includes(thisWeek)) {
              // 如果到达最大值时
              if (Di == DDate.length - 1) {
                resetDay();
                if (Mi == MDate.length - 1) {
                  resetMonth();
                  continue goYear;
                }
                continue goMonth;
              }
              continue;
            }
          } else if (dayRule == 'assWeek') {
            // 如果指定了是第几周的星期几
            // 获取每月1号是属于星期几
            const thisWeek = formatDate(new Date(`${YY}-${MM}-${DD} 00:00:00`), 'week');
            if (dayRuleSup[1] >= thisWeek) {
              DD = (dayRuleSup[0] - 1) * 7 + dayRuleSup[1] - thisWeek + 1;
            } else {
              DD = dayRuleSup[0] * 7 + dayRuleSup[1] - thisWeek + 1;
            }
          } else if (dayRule == 'lastWeek') {
            // 如果指定了每月最后一个星期几
            // 校验并调整如果是2月30号这种日期传进来时需调整至正常月底
            if (checkDate(`${YY}-${MM}-${thisDD} 00:00:00`) !== true) {
              while (DD > 0 && checkDate(`${YY}-${MM}-${thisDD} 00:00:00`) !== true) {
                DD--;
                thisDD = DD < 10 ? `0${DD}` : DD;
              }
            }
            // 获取月末最后一天是星期几
            const thisWeek = formatDate(new Date(`${YY}-${MM}-${thisDD} 00:00:00`), 'week');
            // 找到要求中最近的那个星期几
            if (dayRuleSup < thisWeek) {
              DD -= thisWeek - dayRuleSup;
            } else if (dayRuleSup > thisWeek) {
              DD -= 7 - (dayRuleSup - thisWeek);
            }
          }
          // 判断时间值是否小于10置换成“05”这种格式
          DD = DD < 10 ? `0${DD}` : DD;
          // 循环“时”数组
          // eslint-disable-next-line no-restricted-syntax
          goHour: for (let hi = hIdx; hi < hDate.length; hi++) {
            const hh = hDate[hi] < 10 ? `0${hDate[hi]}` : hDate[hi];
            console.log('循环时', hi);

            // 如果到达最大值时
            if (nMin > mDate[mDate.length - 1]) {
              resetMin();
              if (hi == hDate.length - 1) {
                resetHour();
                if (Di == DDate.length - 1) {
                  resetDay();
                  if (Mi == MDate.length - 1) {
                    resetMonth();
                    continue goYear;
                  }
                  continue goMonth;
                }
                continue goDay;
              }
              continue;
            }
            // 循环"分"数组
            // eslint-disable-next-line no-restricted-syntax
            goMin: for (let mi = mIdx; mi < mDate.length; mi++) {
              const mm = mDate[mi] < 10 ? `0${mDate[mi]}` : mDate[mi];
              console.log('循环分', mi);

              // 如果到达最大值时
              if (nSecond > sDate[sDate.length - 1]) {
                resetSecond();
                if (mi == mDate.length - 1) {
                  resetMin();
                  if (hi == hDate.length - 1) {
                    resetHour();
                    if (Di == DDate.length - 1) {
                      resetDay();
                      if (Mi == MDate.length - 1) {
                        resetMonth();
                        continue goYear;
                      }
                      continue goMonth;
                    }
                    continue goDay;
                  }
                  continue goHour;
                }
                continue;
              }

              // 循环"秒"数组
              for (let si = sIdx; si <= sDate.length - 1; si++) {
                const ss = sDate[si] < 10 ? `0${sDate[si]}` : sDate[si];
                console.log('循环秒', si);

                // 添加当前时间（时间合法性在日期循环时已经判断）
                if (MM !== '00' && DD !== '00') {
                  resultArr.push(`${YY}-${MM}-${DD} ${hh}:${mm}:${ss}`);
                  nums++;
                }
                // 如果条数满了就退出循环
                if (nums == 5) break goYear;
                // 如果到达最大值时
                if (si == sDate.length - 1) {
                  resetSecond();
                  if (mi == mDate.length - 1) {
                    resetMin();
                    if (hi == hDate.length - 1) {
                      resetHour();
                      if (Di == DDate.length - 1) {
                        resetDay();
                        if (Mi == MDate.length - 1) {
                          resetMonth();
                          continue goYear;
                        }
                        continue goMonth;
                      }
                      continue goDay;
                    }
                    continue goHour;
                  }
                  continue goMin;
                }
              } // goSecond
            } // goMin
          } // goHour
        } // goDay
      } // goMonth
    }

    let _resultList: any = [];
    // 判断100年内的结果条数
    if (resultArr.length === 0) {
      _resultList = ['没有达到条件的结果！'];
    } else {
      _resultList = resultArr;
      if (resultArr.length !== 5) {
        _resultList.push(`最近100年内只有上面${resultArr.length}条结果！`);
      }
    }
    console.log(_resultList);

    return _resultList;
    // 计算完成-显示结果
    // this.isShow = true;
  }, [
    cronExpression,
    dateArr,
    dayRule,
    dayRuleSup,
    getDayArr,
    getHourArr,
    getMinArr,
    getMonthArr,
    getSecondArr,
    getWeekArr,
    getYearArr
  ]);

  const setState = (field: string, reset: any) => {
    dispatch({
      [field]: {
        ...allState[field],
        ...reset
      }
    });
  };

  const items = [
    {
      children: (
        <SecRadio
          setState={setState}
          state={allState.sec}
        />
      ),
      key: 'sec',
      label: '秒'
    },
    {
      children: (
        <MinRadio
          setState={setState}
          state={allState.min}
        />
      ),
      key: 'min',
      label: '分钟'
    },
    {
      children: (
        <HourRadio
          setState={setState}
          state={allState.hour}
        />
      ),
      key: 'hour',
      label: '小时'
    },
    {
      children: (
        <DayRadio
          setState={setState}
          state={allState.day}
        />
      ),
      key: 'day',
      label: '日'
    },
    {
      children: (
        <MonthRadio
          setState={setState}
          state={allState.month}
        />
      ),
      key: 'month',
      label: '月'
    },
    {
      children: (
        <WeekRadio
          setState={setState}
          state={allState.week}
        />
      ),
      key: 'week',
      label: '周'
    },
    {
      children: (
        <YearRadio
          setState={setState}
          state={allState.year}
        />
      ),
      key: 'year',
      label: '年'
    }
  ];

  return (
    <ADrawer
      open={true}
      title="任务详情"
      width={800}
      footer={
        <AFlex justify="flex-end">
          <AButton onClick={() => onClose()}>取消</AButton>

          <AButton
            className="mx-2"
            onClick={() => dispatch(initState)}
          >
            重置
          </AButton>
          <AButton
            type="primary"
            onClick={() => onClose(cronExpression)}
          >
            确定
          </AButton>
        </AFlex>
      }
      onClose={() => onClose()}
    >
      <ACard>
        <ATabs
          activeKey={activeKey}
          items={items}
          type="card"
          onChange={val => setActiveKey(val)}
        />
      </ACard>
      <ACard
        className="my-2"
        title={<Title level={5}>时间表达式</Title>}
      >
        <div className="flex">
          <div>
            <div className="text-center">
              <b>秒</b>
            </div>
            <AInput value={sec} />
          </div>
          <div>
            <div className="text-center">
              <b>分钟</b>
            </div>
            <AInput value={min} />
          </div>
          <div>
            <div className="text-center">
              <b>小时</b>
            </div>
            <AInput value={hour} />
          </div>
          <div>
            <div className="text-center">
              <b>日</b>
            </div>
            <AInput value={day} />
          </div>
          <div>
            <div className="text-center">
              <b>月</b>
            </div>
            <AInput value={month} />
          </div>
          <div>
            <div className="text-center">
              <b>周</b>
            </div>
            <AInput value={week} />
          </div>
          <div>
            <div className="text-center">
              <b>年</b>
            </div>
            <AInput value={year} />
          </div>
          <div>
            <div className="text-center">
              <b>Cron 表达式</b>
            </div>
            <AInput value={cronExpression} />
          </div>
        </div>
      </ACard>

      <ACard title={<Title level={5}>最近5次运行时间</Title>}>
        <Paragraph>
          <ul>{resultList?.map((item: string) => <li key={item}>{item}</li>)}</ul>
        </Paragraph>
      </ACard>
    </ADrawer>
  );
});

export default CronExpressionDrawer;
