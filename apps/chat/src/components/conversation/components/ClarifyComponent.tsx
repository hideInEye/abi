import React, { useState, useEffect } from 'react';
import { Button, Alert } from 'antd';

/**
 * 澄清组件：接收 questionData 并进行相应处理
 * @param {Object} questionData - 来自父组件的数据
 * @param {Function} onComplete - 完成后的回调函数
 */
const ClarifyComponent: React.FC<{ questionData: any, onComplete: (ICparameter: any) => void }> = ({ questionData, onComplete }) => {
  // 初始化选择的日期、维度和指标
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDims, setSelectedDims] = useState<string[]>([]);
  const [selectedInds, setSelectedInds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const txt: string = '为保障问题理解的准确性，请您从下方推荐选项中勾选所需"日期"、"维度"、"指标"，以完善问题表述： ';

  // 设置默认值：如果只有一个选项则禁用选择
  useEffect(() => {
    if (questionData.rec_date.length === 1) {
      setSelectedDate(questionData.rec_date[0]);
    }

    if (questionData.rec_dim.length === 1) {
      setSelectedDims([questionData.rec_dim[0]]);
    }

    if (questionData.rec_ind.length === 1) {
      setSelectedInds([questionData.rec_ind[0]]);
    }
  }, [questionData]);

  // 处理日期选择
  const handleDateSelect = (date: string) => {
    if (questionData.rec_date.length > 1) {
      setSelectedDate(date);
    }
  };

  // 处理维度选择
  const handleDimSelect = (dim: string) => {
    if (questionData.rec_dim.length > 1) {
      const newDims = selectedDims.includes(dim)
        ? selectedDims.filter(d => d !== dim)
        : [...selectedDims, dim];
      setSelectedDims(newDims);
    }
  };

  // 处理指标选择
  const handleIndSelect = (ind: string) => {
    if (questionData.rec_ind.length > 1) {
      const newInds = selectedInds.includes(ind)
        ? selectedInds.filter(i => i !== ind)
        : [...selectedInds, ind];
      setSelectedInds(newInds);
    }
  };

  // 生成查询字符串
  const generateQuery = () => {
    if (!selectedDate || selectedDims.length === 0 || selectedInds.length === 0) {
      setError('请完整选择日期、维度和指标');
      return;
    }

    setError(null); // 清除错误信息

    let query = '';
    if (questionData.chat_mode === 'chat_with_db_execute') {
      query = `请查询${selectedDate}${selectedDims.join('、')}${selectedInds.join('、')} 数据`;
    } else if (questionData.chat_mode === 'chat_with_analysis') {
      query = `请分析${selectedDate}${selectedDims.join('、')}${selectedInds.join('、')} 异常原因`;
    } else if (questionData.chat_mode === 'chat_with_predict') {
      query = `请查询${selectedDate}${selectedDims.join('、')}${selectedInds.join('、')} 数据, 预测`;
    }

    // 组装二次意图澄清参数
    const ICparameter = {
      query,
      clarify_flag:true,
      chat_mode:questionData.chat_mode
    }

    onComplete(ICparameter); // 触发父组件的回调，传递拼接的查询字符串
  };

  // 公共样式类
  const flexBetween = "flex justify-between items-center gap-[20px]";
  const flexGap = "flex-1 flex gap-[15px]";
  const inputStyle = "bg-gray-200 p-1 rounded-md bg-[#F5F5F5] text-[#bebebe]";

  return (
    <div className="container">
      <p>{txt}</p>

      {error && <Alert message={error} type="error" showIcon style={{ margin: '20px 0px' }} />}

      <div className="w-[100%] grid gap-[20px] mt-[20px]">
        {/* 选择日期 */}
        <div className={flexBetween}>
          <label>选择日期:</label>
          <div className={flexGap}>
            {questionData.rec_date.length === 1 ? (
              <div className={inputStyle}>{questionData.rec_date[0]}</div>
            ) : (
              questionData.rec_date.map((date: string) => (
                <div
                  key={date}
                  onClick={() => handleDateSelect(date)}
                  className={`cursor-pointer p-1 rounded-md opacity-[0.8] ${selectedDate === date ? 'bg-[#E6F4FF] text-[#2E86FF]' : 'hover:opacity-[1]'}`}
                >
                  {date}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 选择维度 */}
        <div className={flexBetween}>
          <label>选择维度:</label>
          <div className={flexGap}>
            {questionData.rec_dim.length === 1 ? (
              <div className={inputStyle}>{questionData.rec_dim[0]}</div>
            ) : (
              questionData.rec_dim.map((dim: string) => (
                <div
                  key={dim}
                  onClick={() => handleDimSelect(dim)}
                  className={`cursor-pointer p-1 rounded-md opacity-[0.8] ${selectedDims.includes(dim) ? 'bg-[#E6F4FF] text-[#2E86FF]' : 'hover:opacity-[1]'}`}
                >
                  {dim}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 选择指标 */}
        <div className={flexBetween}>
          <label>选择指标:</label>
          <div className={flexGap}>
            {questionData.rec_ind.length === 1 ? (
              <div className={inputStyle}>{questionData.rec_ind[0]}</div>
            ) : (
              questionData.rec_ind.map((ind: string) => (
                <div
                  key={ind}
                  onClick={() => handleIndSelect(ind)}
                  className={`cursor-pointer p-1 rounded-md opacity-[0.8] ${selectedInds.includes(ind) ? 'bg-[#E6F4FF] text-[#2E86FF]' : 'hover:opacity-[1]'}`}
                >
                  {ind}
                </div>
              ))
            )}
          </div>
        </div>

        <Button size="middle" type="primary" onClick={generateQuery} className="w-[35%] mt-[20px]">
          完成
        </Button>
      </div>
    </div>
  );
};

export default ClarifyComponent;